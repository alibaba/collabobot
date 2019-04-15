import { BaseComponentConfig } from "../../baseComponentConfig";

export default class WelcomeInstallComponentConfig extends BaseComponentConfig {
    constructor() {
        super();
        this.enable = true;
        this.title = "[Notice] Welcome to use collabobot as your repo maintainer!";
        this.body = "It is my honor to serve this repo, please follow the instructions to properly setup.";
    }
    title: string;
    body: string;
}
