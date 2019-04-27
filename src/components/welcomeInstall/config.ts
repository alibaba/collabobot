import { BaseComponentConfig } from "baseComponentConfig";

export default class WelcomeInstallComponentConfig extends BaseComponentConfig {
    constructor() {
        super();
        this.enable = true;
        this.title = "[Notice] Welcome to use collabobot as your collaborator!";
        this.body = "It is my honor to serve this repo, please check the [config template file](https://github.com/alibaba/collabobot/blob/master/configTemplate.js) to properly setup.\n\n" +
            "You can also refer to [collabobot's config](https://github.com/alibaba/collabobot/blob/master/.github/collabobot.js).\n\n" +
            "If you have any questions or troubles on configuration, please feel free to [fire an issue](https://github.com/alibaba/collabobot/issues/new).";
    }
    title: string;
    body: string;
}
