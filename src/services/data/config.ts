import { BaseComponentConfig } from "baseComponentConfig";

export default class DataServiceConfig extends BaseComponentConfig {
    constructor() {
        super();
        this.updateTime = "0 6 * * *";
        this.jobName = "DataUpdate";
        this.dataFetch = {
            tokens: []
        }
    }
    updateTime: string;
    jobName: string;
    dataFetch: {
        tokens: string[]
    }
}
