import { BaseComponent } from "baseComponent";
import IssueTranslatorComponentConfig from "./config";
import { WebhookPayloadIssues } from "@octokit/webhooks";
import { Context } from "probot";
import { TranslateResult } from "services/translate";
import * as os from "os";

export default class IssueTranslatorComponent extends BaseComponent {

    public async onLoad(): Promise<void> {
        this.app.on("issues.opened", context => this.process(context));
    }

    private async process(context: Context<WebhookPayloadIssues>): Promise<void> {
        let config = await this.app.configService.getConfigByContext(context, IssueTranslatorComponentConfig);
        if (!config.enable) return;

        let issue = context.payload.issue;
        if (config.notProcess(issue.title, issue.body, issue.user.login)) return;

        let title = issue.title;
        let body = issue.body;
        let { owner, repo } = this.app.utils.getOwnerAndRepoByContext(context);

        let titleTransResult: TranslateResult = {
            translatedText: title,
            originalText: title,
            detectedSourceLanguage: config.to
        }

        if (this.hasChineseChar(title)) {
            titleTransResult = await this.app.translateService.translate(owner, repo, title, config.to);
            if (!titleTransResult) return;
        }

        let bodyArray = body.split(os.EOL); // body maybe none.
        let bodyTransResult: TranslateResult[] = await Promise.all(bodyArray.map(line => {
            if (this.hasChineseChar(line)) {
                // has chinese character, try translate
                return this.app.translateService.translate(owner, repo, line, config.to);
            } else {
                // no chinese character, return origin
                return {
                    translatedText: line,
                    originalText: line,
                    detectedSourceLanguage: config.to
                };
            }
        }));
        if (!bodyTransResult) return;

        if (titleTransResult.detectedSourceLanguage === config.to &&
            bodyTransResult.filter(b => this.translated(b, config.to)).length === 0) {
            this.logger.debug(`No translate need for issue #${issue.number} of ${owner}/${repo}`);
            return;
        }

        let commentHeader = this.app.utils.renderString(config.template.header, {
            login: issue.user.login
        });
        let commentTitle = this.app.utils.renderString(config.template.title, {
            title: titleTransResult.translatedText
        });
        let commentBody = this.app.utils.renderString(config.template.body, {
            body: bodyTransResult.map(r => r.translatedText).join(os.EOL)
        });
        let comment = `${commentHeader}${commentTitle}${commentBody}`;

        let github = await this.app.installationsService.getGithubClientByContext(context);
        let commentParam = context.issue({ body: comment });
        github.issues.createComment(commentParam).then(() => {
            this.logger.info(`Issue #${issue.number} translate done of ${owner}/${repo}.`);
        }).catch(this.logger.error);

        if (this.translated(titleTransResult, config.to)) {
            // modify title for issue
            let updateParam = context.issue({ title: titleTransResult.translatedText });
            github.issues.update(updateParam).then(() => {
                this.logger.info(`Issue #${issue.number} title moidfy done of ${owner}/${repo}.`)
            }).catch(this.logger.error);
        }
    }

    private translated(r: TranslateResult, to: string): boolean {
        return r.detectedSourceLanguage !== to && r.translatedText !== r.originalText;
    }

    private hasChineseChar(str: string): boolean {
        return /.*[\u4e00-\u9fa5]+.*/.test(str);
    }
}