import { BaseComponentConfig } from "baseComponentConfig";

export default class IssueTranslatorComponentConfig extends BaseComponentConfig {
    constructor() {
        super();
        this.to = "en";
        this.template = {
            header: `
> Hi @{{login}}, we detect non-English characters in the issue. This comment is an auto translation to help other users to understand this issue.
> ***We encourage you to describe your issue in English which is more friendly to other users.***`,
            title: `

### {{title}}`,
            body: `

{{body}}`
        };
        this.notProcess = () => false;
    }
    to: string;
    template: {
        header: string;
        title: string;
        body: string;
    };
    notProcess: (title: string, body: string, author: string) => boolean;
}
