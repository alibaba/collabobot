import { BaseComponent } from "baseComponent";
import DataServiceConfig from "./config";
import { GithubConnectionPool } from "utils/GithubConnectionPool";
import { RepoUninstalledEvent, NewRepoInstalledEvent, ConfigChangedEvent } from "services/event/events";
import { Job } from "node-schedule";
import { Locker } from "utils/utils";

export default class DataService extends BaseComponent {

    private repoData: Map<string, Repo> = new Map<string, Repo>();
    private userData: Map<string, User> = new Map<string, User>();
    private repoLocker: Locker;
    private updateHandler: Map<string, Job> = new Map<string, Job>();
    private updatingRepoCount: number = 0;
    private concurrentUpdateCount: number = 1;

    public async onLoad(): Promise<void> {

        this.repoLocker = this.app.utils.genLocker();

        // gen jobs for new installed repo
        this.app.eventService.on(NewRepoInstalledEvent, p => {
            this.genJobForRepo(p.owner, p.repo);
            this.updateData(p.owner, p.repo);
        });

        // remove job for uninstalled repo
        this.app.eventService.on(RepoUninstalledEvent, p => {
            this.cancleJobForRepo(p.owner, p.repo);
        });

        // regen job for config change repo
        this.app.eventService.on(ConfigChangedEvent, p => {
            this.cancleJobForRepo(p.owner, p.repo);
            this.genJobForRepo(p.owner, p.repo);
        });
    }

    public async onStarted(): Promise<void> {
        // gen jobs for already installed repos
        let repos = this.app.installationsService.getRepos();
        repos.forEach(r => {
            this.genJobForRepo(r.owner, r.repo);
        });

        // update once on start
        repos.forEach(async r => {
            this.updateData(r.owner, r.repo);
        });
    }

    private async genJobForRepo(owner: string, repo: string): Promise<void> {
        let config = await this.app.configService.getConfigByName(owner, repo, DataServiceConfig);
        let job = this.app.schedulerService.register(`${config.jobName}-${owner}-${repo}`, config.updateTime, () => {
            this.updateData.call(this, owner, repo);
        });
        this.updateHandler.set(this.app.utils.genRepoFullName(owner, repo), job);
    }

    private cancleJobForRepo(owner: string, repo: string): void {
        let key = this.app.utils.genRepoFullName(owner, repo);
        let job = this.updateHandler.get(key);
        if (job) {
            job.cancel();
            this.updateHandler.delete(key);
        }
    }

    private async updateData(owner: string, repo: string): Promise<void> {
        let repoKey = this.app.utils.genRepoFullName(owner, repo);
        let locked = this.repoLocker.checkLocked(repoKey);
        if (locked) {
            this.logger.warn(`Repo locked for ${repoKey}`);
            return;
        }
        await this.app.utils.waitFor(() => this.updatingRepoCount < this.concurrentUpdateCount);
        this.updatingRepoCount++;
        this.logger.info("Start to update repo data for", repoKey);

        let config = await this.app.configService.getConfigByName(owner, repo, DataServiceConfig);
        let client = new GithubConnectionPool();
        client.init({
            tokens: config.dataFetch.tokens
        });

        let [repoInfo, stars, watches, forks, pullRequests, issues, commits] = await Promise.all([
            client.repo.info(repoKey),
            client.repo.stars(repoKey),
            client.repo.watches(repoKey),
            client.repo.forks(repoKey),
            client.repo.pullRequests(repoKey),
            client.repo.issues(repoKey),
            client.repo.commits(repoKey)
        ]);
        let repoData = new Repo(repoInfo.owner.login, repoInfo.name, repoInfo.id);
        repoData.stars = stars.map(s => {
            let star = new UserWithTimestamp();
            star.user = this.getUser((<any>s).user.login, (<any>s).user.id);
            star.time = new Date((<any>s).starred_at);
            return star;
        });
        repoData.watches = watches.map(w => {
            return this.getUser(w.login, w.id);
        });
        repoData.forks = forks.map(f => {
            let fork = new UserWithTimestamp();
            fork.user = this.getUser(f.owner.login, f.owner.id);
            fork.time = new Date(f.created_at);
            return fork;
        });
        repoData.pullRequests = pullRequests.map(p => {
            let pr = new PullRequest();
            pr.issue = new Issue(p.number, p.id, p.title, p.body, p.created_at, p.updated_at,
                p.closed_at, p.issue_url, p.labels.map(l => new Label(l.id, l.name, l.color, l.description)));
            pr.issue.author = this.getUser(p.user.login, p.user.id);
            pr.merged = p.merged_at != null;
            return pr;
        });
        repoData.issues = issues.map(i => {
            if (i.pull_request) return null; // ignore pull requests
            let issue = new Issue(i.number, i.id, i.title, i.body, i.created_at, i.updated_at,
                i.closed_at, i.url, i.labels.map(l => new Label(l.id, l.name, l.color, l.description)));
            issue.author = this.getUser(i.user.login, i.user.id);
            return issue;
        }).filter(i => i);
        commits.forEach(commit => {
            if (!commit.author) return;
            let user = repoData.contributors.find(u => u.user.login === commit.author.login);
            if (!user) {
                repoData.contributors.push({
                    user: this.getUser(commit.author.login, commit.author.id),
                    time: new Date(commit.commit.committer.date)
                });
            } else if (user.time > new Date(commit.commit.committer.date)) {
                user.time = new Date(commit.commit.committer.date);
            }
        });
        this.repoData.set(repoKey, repoData);
        this.repoLocker.releaseLock(repoKey);
        this.updatingRepoCount--;
        this.logger.info("Update data done for repo ", repoKey);
    }

    private getUser(login: string, id: number): User {
        let user = this.userData.get(login);
        if (!user) {
            user = new User(login, id);
            this.userData.set(login, user);
        }
        return user;
    }


    public getData(owner: string, repo: string): Repo {
        let repoKey = this.app.utils.genRepoFullName(owner, repo);
        return this.repoData.get(repoKey);
    }
}

export class Repo {
    constructor(owner: string, repo: string, id: number) {
        this.owner = owner;
        this.repo = repo;
        this.id = id;
        this.watches = [];
        this.contributors = [];
        this.stars = [];
        this.forks = [];
        this.issues = [];
        this.pullRequests = [];
    }
    public owner: string;
    public repo: string;
    public id: number;
    public watches: User[];
    public contributors: UserWithTimestamp[];
    public stars: UserWithTimestamp[];
    public forks: UserWithTimestamp[];
    public pullRequests: PullRequest[];
    public issues: Issue[];
}

export class User {
    constructor(login: string, id: number) {
        this.login = login;
        this.id = id;
        this.email = null;
    }
    public login: string;
    public id: number;
    public email: string;
}

export class UserWithTimestamp {
    public user: User;
    public time: Date;
}

export class PullRequest {
    constructor() {
        this.changeLines = 0;
        this.reivews = [];
    }
    public issue: Issue;
    public merged: boolean;
    public changeLines: number;
    public reivews: Review[];
}

export class Issue {
    constructor(number: number, id: number, title: string, body: string,
        createdAt: string, updatedAt: string, closedAt: string, url: string, labels: Label[]) {
        this.number = number;
        this.id = id;
        this.title = title;
        this.body = body;
        if (createdAt) {
            this.createdAt = new Date(createdAt);
        }
        if (updatedAt) {
            this.updatedAt = new Date(updatedAt);
        }
        if (closedAt) {
            this.closedAt = new Date(closedAt);
        }
        this.comments = [];
        this.labels = labels;
    }
    public number: number;
    public id: number;
    public title: string;
    public body: string;
    public author: User;
    public createdAt: Date;
    public updatedAt: Date;
    public closedAt: Date;
    public comments: Comment[];
    public labels: Label[];
    public url: string;
}

export class Comment {
    public id: number;
    public number: number;
    public author: User;
    public body: string;
    public createdAt: Date;
}

export class Review {
    public id: number;
    public number: number;
    public author: User;
}

export class Label {
    constructor(id: number, name: string, color: string, description: string) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.description = description;
    }
    public id: number;
    public name: string;
    public color: string;
    public description: string;
}
