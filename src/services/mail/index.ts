import { BaseComponent } from "baseComponent";
import MailServiceConfig from "./config";
import * as Nodemailer from "nodemailer";
import { Context } from "probot";

export default class MailService extends BaseComponent {

    public async send(context: Context, options: Nodemailer.SendMailOptions): Promise<void> {
        let config = await this.app.configService.getConfigByContext(context, MailServiceConfig);
        if (!config.enable) return;
        let client = Nodemailer.createTransport(config.connectOptions);
        client.verify().then(ready => {
            if (!ready) return;
            client.sendMail(options).catch(e => {
                // try resend if send timeout
                if (e.code === "ETIMEDOUT") {
                    this.send(context, options);
                } else {
                    this.logger.error("Error when send mail ", e);
                }
            });
        }).catch(e => {
            // try resend if verify timeout
            if (e.code === "ETIMEDOUT") {
                this.send(context, options);
            } else {
                this.logger.error("Error when verify ", e);
            }
        });
    }

    public async getDefaultSendOptions(context: Context): Promise<Nodemailer.SendMailOptions> {
        let config = await this.app.configService.getConfigByContext(context, MailServiceConfig);
        if (!config.enable) return Promise.resolve(null);
        return config.generateDefaultSendOptions();
    }

}
