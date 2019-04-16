import { BaseComponentConfig } from "baseComponentConfig";

export default class DingTalkNotifyServiceConfig extends BaseComponentConfig {
    constructor() {
        super();
        this.webhook = "";
    }
    webhook: string;
}