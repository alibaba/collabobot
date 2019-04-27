import { BaseComponent } from "baseComponent";
import { GitHubAPI } from "probot/lib/github";
import { NewRepoInstalledEvent, RepoUninstalledEvent } from "services/event/events";
import { Context } from "probot";

type InstalledRepos = {
    owner: string;
    repo: string;
    installationId: number;
}

export default class InstallationsService extends BaseComponent {

    private installedRepos: Map<string, InstalledRepos> = new Map<string, InstalledRepos>();

    public async onLoad(): Promise<void> {
        try {
            const github = await this.app.auth();
            const installations = await github.paginate(
                github.apps.listInstallations({ per_page: 100 }),
                res => res.data
            );
            let repoProcess = installations.map(i => this.initInstallation(i.id));
            await Promise.all(repoProcess);
            this.logger.info("Installed repos get done, repos =",
                JSON.stringify(Array.from(this.installedRepos.values()).map(r => this.app.utils.genRepoFullName(r.owner, r.repo))));
            this.printStatus();
        } catch (e) {
            this.logger.error(`Error `, e);
        }

        // handle new repo install along with new installation
        this.app.on("installation.created", async (context): Promise<void> => {
            await Promise.all(context.payload.repositories.map(async (r: any) => {
                this.logger.info(`Installed on repo ${r.full_name}`);
                let { owner, repo } = this.app.utils.getOwnerAndRepoByFullName(r.full_name);
                await this.addRepository(owner, repo, context.payload.installation.id);
                this.app.eventService.trigger(NewRepoInstalledEvent, { owner, repo });
            }));
            this.printStatus();
        });

        // handle new repo install event
        this.app.on("installation_repositories.added", async (context): Promise<void> => {
            await Promise.all(context.payload.repositories_added.map(async (r: any) => {
                this.logger.info(`Installed on repo ${r.full_name}`);
                let { owner, repo } = this.app.utils.getOwnerAndRepoByFullName(r.full_name);
                await this.addRepository(owner, repo, context.payload.installation.id);
                this.app.eventService.trigger(NewRepoInstalledEvent, { owner, repo });
            }));
            this.printStatus();
        });

        // handle repo uninstall event
        this.app.on("installation_repositories.removed", async (context): Promise<void> => {
            context.payload.repositories_removed.map((r: any) => {
                this.logger.info(`Remove installation from repo ${r.full_name}`);
                let { owner, repo } = this.app.utils.getOwnerAndRepoByFullName(r.full_name);
                this.removeRepository(owner, repo);
                this.app.eventService.trigger(RepoUninstalledEvent, { owner, repo });
            });
            this.printStatus();
        });
    }

    private async initInstallation(installationId: number): Promise<void> {
        const github = await this.app.auth(installationId);
        const repos = await github.paginate(
            github.apps.listRepos({ per_page: 100 }),
            res => res.data
        );
        repos.forEach(repo => {
            repo.repositories.forEach((r: any) => this.addRepository(r.owner.login, r.name, installationId));
        });
    }

    private async addRepository(owner: string, repo: string, installationId: number): Promise<void> {
        this.installedRepos.set(this.app.utils.genRepoFullName(owner, repo), {
            owner,
            repo,
            installationId
        });
    }

    private removeRepository(owner: string, repo: string): void {
        this.installedRepos.delete(this.app.utils.genRepoFullName(owner, repo));
    }

    public getRepos(): Array<{ owner: string, repo: string }> {
        return Array.from(this.installedRepos.values());
    }

    public async getGithubClientByContext(context: Context): Promise<GitHubAPI> {
        return this.getGithubClient(context.payload.repository.owner.login, context.payload.repository.name);
    }

    public async getGithubClient(owner: string, repo: string): Promise<GitHubAPI> {
        let item = this.installedRepos.get(this.app.utils.genRepoFullName(owner, repo));
        if (!item) return Promise.resolve(null);
        let github = await this.app.auth(item.installationId);
        github.hook.before("request", options => {
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
        return github;
    }

    private printStatus() {
        this.logger.trace(`The installed repos are: `, this.installedRepos);
    }

}
