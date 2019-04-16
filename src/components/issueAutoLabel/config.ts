import { BaseComponentConfig } from "baseComponentConfig";

export default class IssueAutoLabelComponentConfig extends BaseComponentConfig {
    constructor() {
        super();
        this.notProcess = () => false;
    }
    notProcess: (title: string, body: string, author: string) => boolean;
}
