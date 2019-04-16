import { BaseComponent } from "baseComponent";
import PrSizeLabelComponentConfig from "./config";

export default class PrSizeLabelComponent extends BaseComponent {

    public async onLoad(): Promise<void> {
        this.app.on("pull_request.opened", async context => {
            let config = await this.app.configService.getConfigByContext(context, PrSizeLabelComponentConfig);
            if (!config.enable) return;
            let pr = context.payload.pull_request;
            if (!pr.additions && !pr.deletions) {
                return;
            }
            let changeLines = 0;
            if (pr.additions) changeLines += pr.additions;
            if (pr.deletions) changeLines += pr.deletions;
            this.logger.debug(`Pull request ${pr.number} changelines=${changeLines}`);
            let label: string;
            if (changeLines < config.xsSizeLines) {
                label = "size/XS";
            } else if (changeLines < config.sSizeLines) {
                label = "size/S";
            } else if (changeLines < config.mSizeLines) {
                label = "size/M";
            } else if (changeLines < config.lSizeLines) {
                label = "size/L";
            } else if (changeLines < config.xlSizeLines) {
                label = "size/XL";
            } else {
                label = "size/XXL";
            }

            let github = await this.app.installationsService.getGithubClientByContext(context);
            let param = context.issue({ labels: [label] });
            let { owner, repo } = this.app.utils.getOwnerAndRepoByContext(context);
            github.issues.addLabels(param).then(r => {
                this.logger.info(`Add label ${label} for pr #${pr.number} of ${owner}/${repo}`);
            }).catch(e => {
                this.logger.error(`Error when add ${label} label to pr #${pr.number} of ${owner}/${repo}, e=`, e);
            });
        });
    }

}
