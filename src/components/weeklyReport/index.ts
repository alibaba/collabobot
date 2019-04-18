import { BaseComponent } from "baseComponent";
import WeeklyReportComponentConfig from "./config";
import { NewRepoInstalledEvent, RepoUninstalledEvent, ConfigChangedEvent } from "services/event/events";
import { Job } from "node-schedule";
import { EOL } from "os";

type weeklyData = {
    star: number,
    contributor: number,
    fork: number,
    watch: number,
}

export default class WeeklyReportComponent extends BaseComponent {

    private processHandler: Map<string, Job> = new Map<string, Job>();

    public async onLoad(): Promise<void> {
        // gen jobs for new installed repo
        this.app.eventService.on(NewRepoInstalledEvent, p => {
            this.genJobForRepo(p.owner, p.repo);
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
    }

    private async genJobForRepo(owner: string, repo: string): Promise<void> {
        let config = await this.app.configService.getConfigByName(owner, repo, WeeklyReportComponentConfig);
        if (!config.enable) return;
        let job = this.app.schedulerService.register(`${config.jobName}-${owner}-${repo}`, config.generateTime, () => {
            this.process(owner, repo);
        });
        this.processHandler.set(this.app.utils.genRepoFullName(owner, repo), job);
    }

    private cancleJobForRepo(owner: string, repo: string): void {
        let key = this.app.utils.genRepoFullName(owner, repo);
        let job = this.processHandler.get(key);
        if (job) {
            job.cancel();
            this.processHandler.delete(key);
        }
    }

    private async process(owner: string, repo: string): Promise<void> {
        let config = await this.app.configService.getConfigByName(owner, repo, WeeklyReportComponentConfig);
        this.removeOldWeeklyReports(owner, repo);
        let generatedContents: string[] = [];
        generatedContents.push(this.generateHeader(owner, repo, config));
        generatedContents.push(this.generateOverview(owner, repo, config));
        generatedContents.push(this.generatePullRequestOverview(owner, repo, config));
        let codeReviewOverviewStr = await this.generateCodeReviewOverview(owner, repo, config);
        generatedContents.push(codeReviewOverviewStr);
        generatedContents.push(this.generateContributorOverview(owner, repo, config));
        let weeklyReportStr = generatedContents.join(EOL);

        let title = this.app.utils.renderString(config.weeklyReportTemplate.title, {
            alias: this.getAlias(repo, config),
            startTime: this.app.utils.getLastWeek().toLocaleDateString(),
            endTime: new Date().toLocaleDateString()
        });

        let github = await this.app.installationsService.getGithubClient(owner, repo);
        github.issues.create({
            owner,
            repo,
            title,
            body: weeklyReportStr,
            labels: ["weekly-report"]
        }).then(r => {
            this.logger.info(`Generate weekly report for ${owner}/${repo} done, issue number=${r.data.number}`);
        }).catch(e => {
            this.logger.error(`Error while creating issue for weekly report of ${owner}/${repo}, e=`, e);
        });
    }

    private async removeOldWeeklyReports(owner: string, repo: string): Promise<void> {
        let removeIssues = this.app.dataService.getData(owner, repo).issues.filter(
            issue => issue.labels.some(l => l.name === "weekly-report"));
        if (removeIssues.length === 0) return;
        let conn = await this.app.installationsService.getGithubClient(owner, repo);
        removeIssues.forEach(issue => {
            conn.issues.update({
                owner: owner,
                repo: repo,
                number: issue.number,
                state: "closed"
            });
        });
    }

    private generateHeader(owner: string, repo: string, config: WeeklyReportComponentConfig): string {
        return this.app.utils.renderString(config.weeklyReportTemplate.header, { alias: this.getAlias(repo, config) });
    }

    private generateOverview(owner: string, repo: string, config: WeeklyReportComponentConfig): string {
        let lastWeek = this.app.utils.getLastWeek();
        let repoData = this.app.dataService.getData(owner, repo);
        let currentData: weeklyData = {
            star: repoData.stars.length,
            watch: repoData.watches.length,
            contributor: repoData.contributors.length,
            fork: repoData.forks.length,
        }
        let deltaData: weeklyData = {
            star: repoData.stars.filter(star => star.time >= lastWeek).length,
            watch: 0,
            contributor: repoData.contributors.filter(cont => cont.time >= lastWeek).length,
            fork: repoData.forks.filter(fork => fork.time >= lastWeek).length
        }
        let decorateDelta = (value: number): string => {
            if (value > 0) {
                return `↑${value}`;
            } else if (value < 0) {
                return `↓${value}`;
            } else {
                return "-";
            }
        }
        let newIssue = repoData.issues.filter(issue => issue.createdAt >= lastWeek).length;
        let closeIssue = repoData.issues.filter(issue =>
            issue.closedAt && issue.closedAt >= lastWeek).length;
        let newPr = repoData.pullRequests.filter(pr => pr.issue.createdAt >= lastWeek).length;
        let mergedPr = repoData.pullRequests.filter(pr =>
            pr.merged && pr.issue.closedAt >= lastWeek).length;
        let overviewStr = this.app.utils.renderString(config.weeklyReportTemplate.overview, {
            star: currentData.star,
            starDelta: decorateDelta(deltaData.star),
            fork: currentData.fork,
            forkDelta: decorateDelta(deltaData.fork),
            contributor: currentData.contributor,
            contributorDelta: decorateDelta(deltaData.contributor),
            watch: currentData.watch,
            newIssue,
            closeIssue,
            newPr,
            mergedPr
        });
        return overviewStr;
    }

    private generatePullRequestOverview(owner: string, repo: string, config: WeeklyReportComponentConfig): string {
        let lastWeek = this.app.utils.getLastWeek();
        let prs = this.app.dataService.getData(owner, repo).pullRequests.filter(pr =>
            pr.merged && pr.issue.closedAt >= lastWeek);
        let pullRequestStrs = "";
        prs.forEach(pr => {
            pullRequestStrs += this.app.utils.renderString(config.weeklyReportTemplate.singlePullRequest, {
                title: pr.issue.title,
                number: pr.issue.number,
                link: pr.issue.url
            });
        });
        let options: any = {
            alias: this.getAlias(repo, config),
            mergedPrCount: prs.length,
            pullRequestStrs
        };
        let pullRequestsStr = this.app.utils.renderString(config.weeklyReportTemplate.pullRequests, options);
        return pullRequestsStr;
    }

    private async generateCodeReviewOverview(owner: string, repo: string, config: WeeklyReportComponentConfig): Promise<string> {
        let lastWeek = this.app.utils.getLastWeek();
        // get prs merged last week or still in open state
        let mergedOrOpenPrs = this.app.dataService.getData(owner, repo).pullRequests
            .filter(pr => (pr.merged && pr.issue.closedAt >= lastWeek) || !pr.issue.closedAt);
        let reviewers = new Array<{
            login: string,
            reviewCount: number
        }>();
        for (let i = 0; i < mergedOrOpenPrs.length; i++) {
            let pr = mergedOrOpenPrs[i];
            let github = await this.app.installationsService.getGithubClient(owner, repo);
            let reviews = await github.paginate(
                github.pulls.listReviews({
                    owner,
                    repo,
                    number: pr.issue.number,
                    per_page: 100,
                }),
                res => res.data
            );

            reviews.filter(review => (<any>review).submitted_at && new Date((<any>review).submitted_at) >= lastWeek).forEach(review => {
                let reviewer = reviewers.find(r => r.login === review.user.login);
                if (reviewer) {
                    reviewer.reviewCount++;
                } else {
                    reviewers.push({
                        login: review.user.login,
                        reviewCount: 1
                    });
                }
            });
        }
        reviewers.sort((a, b) => b.reviewCount - a.reviewCount);
        let reviewOverviewStr = this.app.utils.renderString(config.weeklyReportTemplate.review, {
            alias: this.getAlias(repo, config),
            reviewerStrs: reviewers.map(r => this.app.utils.renderString(config.weeklyReportTemplate.singleReview, r)).join("")
        });
        return reviewOverviewStr;
    }

    private generateContributorOverview(owner: string, repo: string, config: WeeklyReportComponentConfig): string {
        let lastWeek = this.app.utils.getLastWeek();
        let contributors = this.app.dataService.getData(owner, repo).contributors.filter(c => c.time >= lastWeek);
        if (contributors.length > 0) {
            return this.app.utils.renderString(config.weeklyReportTemplate.newContributors, {
                alias: this.getAlias(repo, config),
                owner,
                repo,
                contributorStrs: contributors.map(c => this.app.utils.renderString(config.weeklyReportTemplate.singleContributor,
                    { login: c.user.login })).join(EOL)
            });
        } else {
            return this.app.utils.renderString(config.weeklyReportTemplate.noNewContributors, { alias: this.getAlias(repo, config) });
        }
    }

    private getAlias(repo: string, config: WeeklyReportComponentConfig): string {
        if (!config.repoAlias || config.repoAlias === "") return repo;
        return config.repoAlias;
    }
}
