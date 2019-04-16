import { BaseComponent } from "baseComponent";
import DingTalkNotifyServiceConfig from "./config";
const DingTalkRobot = require("dingtalk-robot-sender");

export default class DingTalkNotifyService extends BaseComponent {
    public async text(owner: string, repo: string, content: string, at?: DingTalkAt): Promise<any> {
        let config = await this.getConfig(owner, repo);
        if (!config.enable) return Promise.resolve(null);
        let robot = new DingTalkRobot({ webhook: config.webhook });
        return robot.text(content, at);
    }

    public async link(owner: string, repo: string, content: DingTalkLink): Promise<any> {
        let config = await this.getConfig(owner, repo);
        if (!config.enable) return Promise.resolve(null);
        let robot = new DingTalkRobot({ webhook: config.webhook });
        return robot.link(content);
    }

    public async markdown(owner: string, repo: string, title: string, text: string, at?: DingTalkAt): Promise<any> {
        let config = await this.getConfig(owner, repo);
        if (!config.enable) return Promise.resolve(null);
        let robot = new DingTalkRobot({ webhook: config.webhook });
        return robot.markdown(title, text, at);
    }

    public async actionCard(owner: string, repo: string, card: DingTalkActionCard): Promise<any> {
        let config = await this.getConfig(owner, repo);
        if (!config.enable) return Promise.resolve(null);
        let robot = new DingTalkRobot({ webhook: config.webhook });
        return robot.actionCard(card);
    }

    public async feedCard(owner: string, repo: string, cards: DingTalkFeedCard[]): Promise<any> {
        let config = await this.getConfig(owner, repo);
        if (!config.enable) return Promise.resolve(null);
        let robot = new DingTalkRobot({ webhook: config.webhook });
        return robot.feedCard(cards);
    }

    private async getConfig(owner: string, repo: string): Promise<DingTalkNotifyServiceConfig> {
        return this.app.configService.getConfigByName(owner, repo, DingTalkNotifyServiceConfig);
    }
}

type DingTalkAt = {
    atMobiles?: string[];
    isAtAll?: boolean;
}

type DingTalkLink = {
    title?: string;
    text?: string;
    picUrl?: string;
    messageUrl?: string;
}

type DingTalkCardBtn = {
    title?: string;
    actionURL?: string;
}

type DingTalkActionCard = {
    title?: string;
    text?: string;
    hideAvatar?: number;
    btnOrientation?: number;
    btns?: DingTalkCardBtn[];
}

type DingTalkFeedCard = {
    title?: string;
    text?: string;
    messageUrl?: string;
    picUrl?: string;
}
