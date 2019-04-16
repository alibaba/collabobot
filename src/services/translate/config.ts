import { BaseComponentConfig } from "baseComponentConfig";

export default class TranslateServiceConfig extends BaseComponentConfig {
    constructor() {
        super();
        this.googleTranslationKey = "";
    }
    googleTranslationKey: string;
}
