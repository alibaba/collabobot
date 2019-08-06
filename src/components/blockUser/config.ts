import { BaseComponentConfig } from "baseComponentConfig";

export default class BlockUserComponentConfig extends BaseComponentConfig {
    constructor() {
        super();
        this.blockUsers = [];
        this.commentDeleteTemplate = `@{{login}}, your comment has been automatically deleted because ` +
            `you have been blocked by this community due to the owners' decision, ` +
            `if you have any question about this, please contact the owner of the community.

The detail reason is: {{reason}}`;
        this.issueCloseCommentTemplate = `@{{login}}, your issue has been automatically closed because ` +
            `you have been blocked by this community due to the owners' decision, ` +
            `if you have any question about this, please contact the owner of the community.

The detail reason is: {{reason}}`;
        this.pullRequestCloseCommentTemplate = `@{{login}}, your pull request has been automatically closed because ` +
            `you have been blocked by this community due to the owners' decision, ` +
            `if you have any question about this, please contact the owner of the community.

The detail reason is: {{reason}}`;
    }
    blockUsers: {
        id: string;
        block: {
            openIssue: boolean;
            issueComment: boolean;
            openPullRequest: boolean;
        };
        reason: string;
    }[];
    issueCloseCommentTemplate: string;
    pullRequestCloseCommentTemplate: string;
    commentDeleteTemplate: string;
}