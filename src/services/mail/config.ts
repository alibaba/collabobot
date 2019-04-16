import * as Nodemailer from "nodemailer";
import { BaseComponentConfig } from "baseComponentConfig";

export default class MailServiceConfig extends BaseComponentConfig {
    constructor() {
        super();
        this.connectOptions = {};
        this.generateDefaultSendOptions = () => { return {} };
    }
    connectOptions: Nodemailer.TransportOptions;
    generateDefaultSendOptions: () => Nodemailer.SendMailOptions;
}
