import { BaseComponent } from "baseComponent";
import IssueAutoLabelComponentConfig from "./config";
import { WebhookPayloadIssues } from "@octokit/webhooks";
import { Context } from "probot";
import LabelSetupComponentConfig from "components/labelSetup/config";

export default class IssueAutoLabelComponent extends BaseComponent {

    public async onStarted(): Promise<void> {
        this.app.on("issues.opened", context => this.process(context));
        this.app.on("issues.edited", (context): Promise<void> => {
            // only try to label when title changed
            if (context.payload.changes && (<any>context.payload.changes).title) {
                return this.process(context);
            }
            return null;
        });
    }

    private async process(context: Context<WebhookPayloadIssues>): Promise<void> {
        let issue = context.payload.issue;
        let config = await this.app.configService.getConfigByContext(context, IssueAutoLabelComponentConfig);
        // check config for not label
        if (!config.enable) return;
        if (config.notProcess(issue.title, issue.body, issue.user.login)) return;
        if (context.isBot) return;

        let labelConfig = await this.app.configService.getConfigByContext(context, LabelSetupComponentConfig);
        let title = issue.title.toLowerCase();
        let attachLabels: string[] = [];
        labelConfig.labels.forEach(label => {
            if (!label.keywords) return;
            label.keywords.forEach(keyword => {
                if (title.includes(keyword)) {
                    attachLabels.push(label.name);
                    return;
                }
            });
        });
        if (attachLabels.length === 0) return;
        attachLabels = this.app.utils.uniqueArray(attachLabels);
        let github = await this.app.installationsService.getGithubClientByContext(context);
        let param = context.issue({ labels: attachLabels });
        await github.issues.addLabels(param).catch(this.logger.error);
        this.logger.info(`Auto label for issue #${issue.number} done,` +
            ` lalels=${JSON.stringify(attachLabels)}`);
    }
}
