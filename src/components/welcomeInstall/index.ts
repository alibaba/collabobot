import { BaseComponent } from "baseComponent";
import WelcomeInstallComponentConfig from "./config";
import { NewRepoInstalledEvent } from "services/event/events";

export default class WelcomeInstallComponent extends BaseComponent {
    public async onLoad(): Promise<void> {
        this.app.eventService.on(NewRepoInstalledEvent, async p => {
            let { owner, repo } = p;
            let config = await this.app.configService.getConfigByName(owner, repo, WelcomeInstallComponentConfig);
            if (!config.enable) return;
            let github = await this.app.installationsService.getGithubClient(owner, repo);
            github.issues.create({
                owner,
                repo,
                title: config.title,
                body: config.body
            });
        });
    }
}
