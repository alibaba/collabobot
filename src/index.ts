require('module-alias/register');
import { Probot, createProbot } from "probot";
import { MyApplication, initApplication, loadApplication, applicationStarted } from "myApplication";
import { Config } from "config";

class Program {
    private probot: Probot;
    private app: MyApplication;
    private config: Config;

    constructor() {
        this.config = new Config();
        this.probot = createProbot({
            webhookPath: this.config.webhookPath,
            port: this.config.port,
            webhookProxy: this.config.webhookProxy,
            secret: this.config.secret,
            id: this.config.id,
            cert: this.config.cert
        });
        this.probot.logger.level("info");
    }

    async setup(): Promise<void> {
        this.app = this.probot.load((): void => { }) as MyApplication;
        this.app.config = this.config;
        initApplication(this.app);
        await loadApplication(this.app);
    }

    async start(): Promise<void> {
        this.probot.start();
    }

    async onStarted(): Promise<void> {
        await applicationStarted(this.app);
    }

}

(async () => {
    console.warn = () => { };
    let program = new Program();
    await program.setup();
    await program.start();
    await program.onStarted();
})();
