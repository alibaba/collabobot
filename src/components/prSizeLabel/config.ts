import { BaseComponentConfig } from "baseComponentConfig";

export default class PrSizeLabelComponentConfig extends BaseComponentConfig {
    constructor() {
        super();
        this.xsSizeLines = 10;
        this.sSizeLines = 30;
        this.mSizeLines = 100;
        this.lSizeLines = 500;
        this.xlSizeLines = 1000;
    }
    xsSizeLines: number;
    sSizeLines: number;
    mSizeLines: number;
    lSizeLines: number;
    xlSizeLines: number;
}
