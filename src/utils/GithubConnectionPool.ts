import Octokit from '@octokit/rest';
const waitFor = require("p-wait-for");
const _ = require("lodash");

type GithubConnection = {
    // connection of octokit/rest
    client: Octokit;
    // token for this connection
    token: string;
    // connection rate limit remaining
    ratelimitRemaining: number;
    // connection rate limit reset time
    ratelimitReset: number;
}

interface Logger {
    (msg: string): void;
}

type GithubConnectionPoolOption = {
    tokens: string[];
    logger?: Logger;
    maxConcurrentReqNumber?: number;
    timeout?: number;
}

type GithubConnectionRepoProxy = {
    info: (repoName: string) => Promise<Octokit.ReposGetResponse>;
    stars: (repoName: string) => Promise<Array<Octokit.ActivityListStargazersForRepoResponseItem>>;
    forks: (repoName: string) => Promise<Array<Octokit.ReposListForksResponseItem>>;
    pullRequests: (repoName: string) => Promise<Array<Octokit.PullsListResponseItem>>;
    pullRequestsComments: (repoName: string) => Promise<Array<Octokit.PullsListCommentsForRepoResponseItem>>;
    issues: (repoName: string) => Promise<Array<Octokit.IssuesListForRepoResponseItem>>;
    issueComments: (repoName: string) => Promise<Array<Octokit.IssuesListCommentsResponseItem>>;
    commits: (repoName: string) => Promise<Array<Octokit.ReposListCommitsResponseItem>>;
    contributors: (repoName: string) => Promise<any>;
    watches: (repoName: string) => Promise<Array<Octokit.ActivityListWatchersForRepoResponseItem>>;
    events: (repoName: string) => Promise<any>;
}

type GithubConnectionSearchProxy = {
    repo: (q: string) => Promise<Array<any>>;
}

type GithubConnectionUserProxy = {
    info: (username: string) => Promise<Octokit.UsersGetByUsernameResponse>;
}

type RepoName = {
    owner: string;
    repo: string;
    error?: string;
}

export class GithubConnectionPool {

    private pool: GithubConnection[] = [];
    private inited: boolean = false;
    private maxConcurrentReqNumber: number = 10;
    private concurrentReqNumber: number = 0;
    private logger: Logger = (m: string): void => { };
    private connectionResetTryInterval: number = 1000;
    private pagingRequestPerPage = 100;
    private getConnectionRetryInterval = 10000;

    init(options: GithubConnectionPoolOption): void {
        let instance = this;
        if (options.tokens.length === 0) {
            throw new Error("At least one token needed.");
        }
        if (options.logger) {
            instance.logger = options.logger;
        }
        let timeout = 10 * 60 * 1000;
        if (options.timeout) timeout = options.timeout;
        if (options.maxConcurrentReqNumber) this.maxConcurrentReqNumber = options.maxConcurrentReqNumber;
        instance.pool = options.tokens.map(t => instance.genConnection(t, timeout));
        instance.inited = true;
    }

    // init github connection
    // 1. create new github connection
    // 2. set auth info
    // 3. set hook for rate limit update
    // 4. set hook for star info with timestamp
    private genConnection(token: string, timeout: number): GithubConnection {
        let instance = this;
        let connection = {
            client: new Octokit({ timeout }),
            token,
            ratelimitRemaining: 100,
            ratelimitReset: -1,
        };
        connection.client.authenticate({
            type: "token",
            token
        });
        connection.client.hook.after("request", response => {
            connection.ratelimitRemaining = parseInt(response.headers["x-ratelimit-remaining"]);
            connection.ratelimitReset = parseInt(response.headers["x-ratelimit-reset"]);
            this.concurrentReqNumber -= 1;
            if (connection.ratelimitRemaining === 0) {
                // no remaining times for the connection
                // next reset interval in ms plus 1 second to ensure the limit has been reset
                let nextResetInterval = (connection.ratelimitReset + 1) * 1000 - new Date().getTime();
                instance.resetConnection(connection, nextResetInterval);
            }
        });
        connection.client.hook.before("request", options => {
            options.headers["User-Agent"] = "Collabobot";
            if (options.url === "/repos/:owner/:repo/stargazers") {
                // modify star request header to get the timestamp
                options.headers.accept = "application/vnd.github.v3.star+json";
            }
            if (options.url === "/repos/:owner/:repo/labels"
                || options.url === "/repos/:owner/:repo/labels/:name"
                || options.url === "/repos/:owner/:repo/labels/:current_name") {
                // modify label request header to support label description in list, get, update
                options.headers.accept = "application/vnd.github.symmetra-preview+json";
            }
        });
        return connection;
    }

    private resetConnection(connection: GithubConnection, nextResetInterval: number): void {
        setTimeout(() => {
            connection.client.rateLimit.get({}).catch(e => {
                this.logger(`Rate limit reset exception, e=${e}, goona try after ${this.connectionResetTryInterval}ms`);
                this.resetConnection(connection, this.connectionResetTryInterval);
            });
        }, nextResetInterval);
    }

    private parseRepo(repoName: string): RepoName {
        let [owner, repo] = repoName.split("/");
        return {
            owner,
            repo,
            error: (!owner || !repo) ? `Parse error for ${repoName}` : undefined
        };
    }

    private pagingWrapper<T>(repoName: string, func: (conn: Octokit, param: any) => Promise<Octokit.Response<Array<T>>>): Promise<Array<T>> {
        return new Promise<T[]>(resolve => {
            let ret: T[] = [];
            // check the repoName
            let repoNameRet = this.parseRepo(repoName);
            if (repoNameRet.error) {
                this.logger(repoNameRet.error);
                resolve(ret);
                return;
            }
            // get results
            this.getConnection().then(async connection => {
                let { owner, repo } = repoNameRet;
                let param = { owner, repo, per_page: this.pagingRequestPerPage, page: 1 };
                let firstPage = await this.requestWapper(() => {
                    return func(connection, param);
                });
                let ret = firstPage.data;
                this.getPagingResults(async (param) => {
                    let conn = await this.getConnection();
                    return func(conn, param);
                }, param, firstPage.headers.link).then(results => {
                    results.forEach(r => {
                        ret = ret.concat(r.data);
                    });
                    resolve(ret);
                });
            });
        });
    }

    private getPagingResults<T>(func: (param: any) => Promise<T>, param: any, link: string): Promise<Array<T>> {
        return new Promise<T[]>(resolve => {
            let ret: T[] = [];
            if (!link) {
                // only one page
                resolve(ret);
                return;
            }
            const pageNum = parseInt(/next.*?&page=(\d*).*?last/.exec(link)[1]);
            let processes: Promise<T>[] = [];
            for (let i = 2; i <= pageNum; i += 1) {
                let p = _.clone(param);
                p.page = i;
                processes.push(this.requestWapper(() => func(p)));
            }
            Promise.all(processes).then(results => {
                ret = ret.concat(results);
                resolve(ret);
            });
        });
    }

    private requestWapper<T>(genPromise: () => Promise<T>): Promise<T> {
        let func = (cb: Function) => {
            genPromise().then(res => cb(res))
                .catch(e => {
                    this.logger(e);
                    this.concurrentReqNumber -= 1;
                    func(cb);
                });
        };
        return new Promise<T>(resolve => {
            func(resolve);
        });
    }

    // get a valid connection
    private async getConnection(): Promise<Octokit> {
        let instance = this;
        if (instance.inited === false) {
            throw new Error("Github pool not inited yet.");
        }
        let connection: GithubConnection;
        await waitFor(() => {
            if (instance.concurrentReqNumber >= instance.maxConcurrentReqNumber) {
                return false;
            }
            let availableConnections = instance.pool.filter(c => c.ratelimitRemaining > 0);
            if (availableConnections.length === 0) return false;
            this.concurrentReqNumber += 1;
            connection = availableConnections[Math.floor(Math.random() * availableConnections.length)]
            return true;
        }, {
                interval: this.getConnectionRetryInterval
            });
        // this.logger(`Now req number is ${instance.concurrentReqNumber}, max req number is ${instance.maxConcurrentReqNumber}`);
        return Promise.resolve(connection.client);
    }

    public getTokenStatus(): any {
        return this.pool.map(con => {
            let retToken = "";
            for (let i = 0; i < con.token.length; i++) {
                if (i < 3 || i >= con.token.length - 3) {
                    retToken += con.token[i];
                } else {
                    retToken += "*";
                }
            }
            return {
                token: retToken,
                remain: con.ratelimitRemaining,
                reset: con.ratelimitReset
            }
        });
    }

    public repo: GithubConnectionRepoProxy = {

        info: (repoName: string): Promise<Octokit.ReposGetResponse> => {
            return new Promise<Octokit.ReposGetResponse>(resolve => {
                let repoNameRet = this.parseRepo(repoName);
                let info: Octokit.ReposGetResponse = null;
                if (repoNameRet.error) {
                    this.logger(repoNameRet.error);
                    resolve(info);
                    return;
                }
                this.getConnection().then(async connection => {
                    let ret = await this.requestWapper(() => {
                        return connection.repos.get({ owner: repoNameRet.owner, repo: repoNameRet.repo })
                    });
                    resolve(ret.data);
                });
            });
        },

        stars: (repoName: string): Promise<Array<Octokit.ActivityListStargazersForRepoResponseItem>> => {
            return this.pagingWrapper(repoName, (conn: Octokit, param: any) => {
                return conn.activity.listStargazersForRepo(param)
            });
        },

        forks: (repoName: string): Promise<Array<Octokit.ReposListForksResponseItem>> => {
            return this.pagingWrapper(repoName, (conn: Octokit, param: any) => {
                return conn.repos.listForks(param);
            });
        },

        pullRequests: (repoName: string): Promise<Array<Octokit.PullsListResponseItem>> => {
            return this.pagingWrapper(repoName, (conn: Octokit, param: any) => {
                param.state = "all";
                return conn.pulls.list(param);
            });
        },

        pullRequestsComments: (repoName: string): Promise<Array<Octokit.PullsListCommentsForRepoResponseItem>> => {
            return this.pagingWrapper(repoName, (conn: Octokit, param: any) => {
                param.state = "all";
                return conn.pulls.listCommentsForRepo(param);
            });
        },

        issues: (repoName: string): Promise<Array<Octokit.IssuesListForRepoResponseItem>> => {
            return this.pagingWrapper(repoName, (conn: Octokit, param: any) => {
                param.state = "all";
                return conn.issues.listForRepo(param);
            });
        },

        issueComments: (repoName: string): Promise<Array<Octokit.IssuesListCommentsResponseItem>> => {
            return this.pagingWrapper(repoName, (conn: Octokit, param: any) => {
                param.state = "all";
                return conn.issues.listCommentsForRepo(param);
            });
        },

        commits: (repoName: string): Promise<Array<Octokit.ReposListCommitsResponseItem>> => {
            return this.pagingWrapper(repoName, (conn: Octokit, param: any) => {
                return conn.repos.listCommits(param);
            });
        },

        contributors: (repoName: string): Promise<any> => {
            return this.pagingWrapper(repoName, (conn: Octokit, param: any) => {
                return conn.repos.listContributors(param);
            });
        },

        watches: (repoName: string): Promise<Array<Octokit.ActivityListWatchersForRepoResponseItem>> => {
            return this.pagingWrapper(repoName, (conn: Octokit, param: any) => {
                return conn.activity.listWatchersForRepo(param);
            });
        },

        events: (repoName: string): Promise<any> => {
            return this.pagingWrapper(repoName, (conn: Octokit, param: any) => {
                return conn.activity.listRepoEvents(param);
            });
        }
    }

    public search: GithubConnectionSearchProxy = {
        repo: (q: string): Promise<Array<any>> => {
            return new Promise<Array<any>>(resolve => {
                this.getConnection().then(async connection => {
                    let param = { q, per_page: this.pagingRequestPerPage, page: 1 };
                    let firstPage = await this.requestWapper(() => {
                        return connection.search.repos(param);
                    });
                    let ret = firstPage.data.items;
                    this.getPagingResults(async (param) => {
                        let conn = await this.getConnection();
                        return conn.search.repos(param);
                    }, param, firstPage.headers.link).then(results => {
                        results.forEach(r => {
                            ret = ret.concat(r.data.items);
                        });
                        resolve(ret);
                    });
                });
            });
        }
    }

    public user: GithubConnectionUserProxy = {
        info: (username: string): Promise<Octokit.UsersGetByUsernameResponse> => {
            return new Promise<Octokit.UsersGetByUsernameResponse>(resolve => {
                this.getConnection().then(async conn => {
                    let info = await this.requestWapper(() => {
                        return conn.users.getByUsername({ username });
                    });
                    resolve(info.data);
                });
            });
        }
    }
}
