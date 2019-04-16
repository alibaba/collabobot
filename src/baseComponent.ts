import { Logger } from "probot";
import { MyApplication } from "myApplication";

export abstract class BaseComponent {
    app: MyApplication;
    protected logger: Logger;
    public name: string = "UnknownComponent";
    constructor(app: MyApplication, name: string) {
        this.name = name;
        this.app = app;
        this.logger = app.log.child({ name: this.name });
    }
    public async onLoad(): Promise<void> { }
    public async onStarted(): Promise<void> { }
}
