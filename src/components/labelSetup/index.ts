import { BaseComponent } from "baseComponent";
import LabelSetupComponentConfig from "./config";
import { ConfigChangedEvent, NewRepoInstalledEvent } from "services/event/events";

export default class LabelSetupComponent extends BaseComponent {
    public async onLoad(): Promise<void> {
        this.app.eventService.on(ConfigChangedEvent, p => {
            this.setup(p.owner, p.repo);
        });
        this.app.eventService.on(NewRepoInstalledEvent, p => {
            this.setup(p.owner, p.repo);
        });
    }

    public async onStarted(): Promise<void> {
        this.app.installationsService.getRepos().forEach(repo => {
            this.setup(repo.owner, repo.repo);
        });
    }

    private async setup(owner: string, repo: string): Promise<void> {
        let config = await this.app.configService.getConfigByName(owner, repo, LabelSetupComponentConfig);
        if (!config.enable) return;
        config.merge();
        let github = await this.app.installationsService.getGithubClient(owner, repo);
        let currentLabels = await github.paginate(
            github.issues.listLabelsForRepo({
                owner,
                repo,
                per_page: 100
            }),
            res => res.data
        );
        let updateNum = 0;
        let updatePromises = config.labels.map(label => {
            let param: any = {
                owner,
                repo,
                name: label.name,
                color: label.color,
                description: label.description
            };
            let oldLabel = currentLabels.find(l => l.name === label.name);
            if (oldLabel) {
                // use current name to update a label
                // see https://developer.github.com/v3/issues/labels/#update-a-label
                param.current_name = label.name;
                delete param.name;
                if (oldLabel.color === label.color) delete param.color;
                if (oldLabel.description === label.description) delete param.description;
                if (!param.color && !param.description) {
                    // no need to update
                    return Promise.resolve(null);
                }
                updateNum++;
                return github.issues.updateLabel(param);
            } else {
                updateNum++;
                return github.issues.createLabel(param);
            }
        });
        if (updateNum === 0) {
            this.logger.info(`No need to update labels for ${owner}/${repo}`);
            return;
        }
        this.logger.info(`Goona update ${updateNum} labels for ${owner}/${repo}`);
        await Promise.all(updatePromises).then(results => {
            this.logger.info(`Update labels for ${owner}/${repo} done.`);
            results.forEach(res => {
                if (res && res.status && res.status >= 300) {
                    this.logger.error(`Error happened when update labels for ${owner}/${repo} ${JSON.stringify(res)}`);
                }
            });
        }).catch(this.logger.error);
    }

}
