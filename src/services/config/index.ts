import { BaseComponent } from "baseComponent";
import { BaseComponentConfig } from "baseComponentConfig";
import _ from "lodash";
import * as path from "path";
import * as fs from "fs";
import requireFromString from "require-from-string";
import { Context } from "probot";
import { ConfigChangedEvent } from "services/event/events";
import { Locker } from "utils/utils";

export default class ConfigService extends BaseComponent {

    // key: repo name, value: {key: component name, value: config}
    private configs: Map<string, Map<string, BaseComponentConfig>> = new Map<string, Map<string, BaseComponentConfig>>();
    private configLocker: Locker;

    public async onLoad() {
        this.configLocker = this.app.utils.genLocker();

        // register repo config change event for repos
        this.app.on("push", async context => {
            if (context.payload.commits.some(commit =>
                commit.added.indexOf(this.app.config.repoConfigPath) >= 0 ||
                commit.removed.indexOf(this.app.config.repoConfigPath) >= 0 ||
                commit.modified.indexOf(this.app.config.repoConfigPath) >= 0
            )) {
                // if the repo config file changed, reset the config for current repo
                this.resetConfigByContext(context);
            }
        });
    }

    private async genDefaultConfig(): Promise<Map<string, BaseComponentConfig>> {
        // make sure to gen new default config every time to avoid deep clone problem
        let defaultConfig = new Map<string, BaseComponentConfig>();
        let loadConfig = async (dir: string, suffix: string): Promise<void> => {
            let list = fs.readdirSync(dir);
            for (let i = 0; i < list.length; i++) {
                let dirName = list[i];
                let directoryPath = path.join(dir, dirName);
                let stat = fs.statSync(directoryPath);
                if (stat && stat.isDirectory()) {
                    let name = `${dirName}${suffix}`;

                    // load config
                    let configPath = path.join(directoryPath, "config.js");
                    if (fs.existsSync(configPath)) {
                        let importPath = configPath.substr(0, configPath.length - 3);
                        let c = await import(importPath);
                        if ("default" in c) {
                            let config = new c.default();
                            defaultConfig.set(name, config);
                        } else {
                            this.logger.error(`No config export found in ${configPath}`);
                        }
                    }
                }
            }
        };
        await loadConfig(this.app.config.servicesDir, "Service");
        await loadConfig(this.app.config.componentDir, "Component");
        return defaultConfig;
    }

    private loadGlobalConfig(configs: Map<string, BaseComponentConfig>): void {
        let localConfigPath = this.app.config.globalConfigPath;
        if (!fs.existsSync(localConfigPath)) return;
        let localConfig = require(localConfigPath);
        this.mergeConfig(configs, localConfig);
    }

    private loadRepoLocalConfig(owner: string, repo: string, configs: Map<string, BaseComponentConfig>): void {
        let key = this.genKey(owner, repo);
        let configPath = path.join(this.app.config.customConfigDir, `${key}.js`);
        if (fs.existsSync(configPath)) {
            let repoConfig = require(configPath);
            this.mergeConfig(configs, repoConfig);
        }
    }

    private async loadRepoRemoteConfig(owner: string, repo: string, configs: Map<string, BaseComponentConfig>): Promise<void> {
        try {
            let github = await this.app.installationsService.getGithubClient(owner, repo);
            if (github) {
                let repoRemoteConfigRes = await github.repos.getContents({
                    owner,
                    repo,
                    path: this.app.config.repoConfigPath
                });
                let repoRemoteConfigContent = Buffer.from(repoRemoteConfigRes.data.content, "base64").toString("ascii");
                let repoRemoteConfig = requireFromString(repoRemoteConfigContent);
                this.mergeConfig(configs, repoRemoteConfig);
            }
        } catch (e) {
            this.logger.warn(`Error load ${this.app.config.repoConfigPath} for ${owner}/${repo}`);
        }
    }

    private mergeConfig(configs: Map<string, BaseComponentConfig>, customConfigs: any): void {
        for (let i in customConfigs) {
            let config = configs.get(i);
            if (!config) continue;
            configs.set(i, _.merge(config, customConfigs[i]));
        }
    }

    public async getConfigByName<T extends BaseComponentConfig>(owner: string, repo: string, constructor: { new(...args: any): T }): Promise<T> {
        let key = this.genKey(owner, repo);

        // wait for the lock to get config in case re-enter and multiple generate process
        let config = await this.configLocker.waitLock(key, async (): Promise<Map<string, BaseComponentConfig>> => {
            let c = this.configs.get(key);
            // if no config found, generate new config for the repo
            if (!c) {
                // config load seq: deafult -> global -> repoLocal -> repoRemote
                c = await this.genDefaultConfig();
                this.loadGlobalConfig(c);
                this.loadRepoLocalConfig(owner, repo, c);
                await this.loadRepoRemoteConfig(owner, repo, c);
                this.logger.info(`Generate new config for ${key} done. config=`, c);
            }
            return c;
        });
        this.configs.set(key, config);

        for (let [i, c] of config) {
            if (c instanceof constructor) {
                return <T>c;
            }
        }

        // not gonna reach here unless get a non-config type
        this.logger.error(`Not found or gen new config for ${key}`);
        return Promise.resolve(null);
    }

    public async getConfigByContext<T extends BaseComponentConfig>(context: Context, constructor: { new(...args: any): T }): Promise<T> {
        return this.getConfigByName(context.payload.repository.owner.login, context.payload.repository.name, constructor);
    }

    public resetConfigByContext(context: Context): void {
        let owner = context.payload.repository.owner.login;
        let repo = context.payload.repository.name;
        this.resetConfigByName(owner, repo);
    }

    public resetConfigByName(owner: string, repo: string) {
        // TODO: no idea why can't get new config file right after the event
        // give 5 seconds delay
        setTimeout(() => {
            let key = this.genKey(owner, repo);
            this.logger.info(`Config reset for ${key}`);
            this.configs.delete(key);
            this.app.eventService.trigger(ConfigChangedEvent, { owner, repo });
        }, 5000);
    }

    private genKey(owner: string, repo: string): string {
        return `${owner}-${repo}`;
    }
}
