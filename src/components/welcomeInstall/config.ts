import { BaseComponentConfig } from "baseComponentConfig";

export default class WelcomeInstallComponentConfig extends BaseComponentConfig {
    constructor() {
        super();
        this.enable = true;
        this.title = "[Notice] Welcome to use collabobot as your repo maintainer!";
        this.body = "It is my honor to serve this repo, please check the [default config](https://github.com/alibaba/collabobot/blob/master/configTemplate.js) to properly setup.";
    }
    title: string;
    body: string;
}
