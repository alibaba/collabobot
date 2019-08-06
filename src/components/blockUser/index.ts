import { BaseComponent } from "baseComponent";
import { WebhookPayloadIssues, WebhookPayloadIssueComment, WebhookPayloadPullRequest } from "@octokit/webhooks";
import { Context } from "probot";
import BlockUserComponentConfig from "./config";

export default class BlockUserComponent extends BaseComponent {
    public async onLoad(): Promise<void> {
        this.app.on("issues.opened", context => this.processIssueOpen(context));
        this.app.on("issues.reopened", context => this.processIssueOpen(context));
        this.app.on("issue_comment.created", context => this.processIssueComment(context));
        this.app.on("pull_request.opened", context => this.processPullRequestOpen(context));
        this.app.on("pull_request.reopened", context => this.processPullRequestOpen(context));
    }

    private async processIssueOpen(context: Context<WebhookPayloadIssues>): Promise<void> {
        let issue = context.payload.issue;
        let config = await this.app.configService.getConfigByContext(context, BlockUserComponentConfig);
        if (!config.enable) return;

        let blockConfig = config.blockUsers.find(u => u.id === issue.user.login);
        if (blockConfig && blockConfig.block.openIssue) {
            // the user has been blocked
            let github = await this.app.installationsService.getGithubClientByContext(context);
            let closeIssueParam = context.issue({ state: <const>"closed" });
            github.issues.update(closeIssueParam).catch(e => this.logger.error(e)).then(() => {
                let commentParam = context.issue({
                    body: this.app.utils.renderString(config.issueCloseCommentTemplate, {
                        login: issue.user.login,
                        reason: blockConfig.reason
                    })
                });
                github.issues.createComment(commentParam).catch(e => this.logger.error(e));
            });
        }
    }

    private async processIssueComment(context: Context<WebhookPayloadIssueComment>): Promise<void> {
        let comment = context.payload.comment;
        let config = await this.app.configService.getConfigByContext(context, BlockUserComponentConfig);
        if (!config.enable) return;

        let blockConfig = config.blockUsers.find(u => u.id === comment.user.login);
        if (blockConfig && blockConfig.block.issueComment) {
            // the user has been blocked
            let github = await this.app.installationsService.getGithubClientByContext(context);
            let deleteCommentParam = context.issue({ comment_id: comment.id });
            github.issues.deleteComment(deleteCommentParam).catch(e => this.logger.error(e)).then(() => {
                let commentParam = context.issue({
                    body: this.app.utils.renderString(config.commentDeleteTemplate, {
                        login: comment.user.login, reason: blockConfig.reason
                    })
                });
                github.issues.createComment(commentParam);
            });
        }
    }

    private async processPullRequestOpen(context: Context<WebhookPayloadPullRequest>): Promise<void> {
        let pr = context.payload.pull_request;
        let config = await this.app.configService.getConfigByContext(context, BlockUserComponentConfig);
        if (!config.enable) return;

        let blockConfig = config.blockUsers.find(u => u.id === pr.user.login);
        if (blockConfig && blockConfig.block.openPullRequest) {
            // the user has been blocked
            let github = await this.app.installationsService.getGithubClientByContext(context);
            let closeIssueParam = context.issue({ state: <const>"closed" });
            github.issues.update(closeIssueParam).catch(e => this.logger.error(e)).then(() => {
                let commentParam = context.issue({
                    body: this.app.utils.renderString(config.pullRequestCloseCommentTemplate, {
                        login: pr.user.login,
                        reason: blockConfig.reason
                    })
                });
                github.issues.createComment(commentParam).catch(e => this.logger.error(e));
            });
        }
    }
}
