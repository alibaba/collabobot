import { Application } from "probot";
import { Config } from "config";
import Utils from "utils/utils";
import ConfigService from "services/config";
import DataService from "services/data";
import DingTalkNotifyService from "services/dingTalkNotify";
import EventService from "services/event";
import InstallationsService from "services/installations";
import MailService from "services/mail";
import SchedulerService from "services/scheduler";
import TranslateService from "services/translate";
import BlockUserComponent from "components/blockUser";
import IssueAutoLabelComponent from "components/issueAutoLabel";
import IssueTranslatorComponent from "components/issueTranslator";
import LabelSetupComponent from "components/labelSetup";
import PrSizeLabelComponent from "components/prSizeLabel";
import WeeklyReportComponent from "components/weeklyReport";
import WelcomeInstallComponent from "components/welcomeInstall";

export class MyApplication extends Application {
    public config: Config;
    public utils = Utils;
    public configService: ConfigService;
    public dataService: DataService;
    public dingTalkNotifyService: DingTalkNotifyService;
    public eventService: EventService;
    public installationsService: InstallationsService;
    public mailService: MailService;
    public schedulerService: SchedulerService;
    public translateService: TranslateService;
    public blockUserComponent: BlockUserComponent;
    public issueAutoLabelComponent: IssueAutoLabelComponent;
    public issueTranslatorComponent: IssueTranslatorComponent;
    public labelSetupComponent: LabelSetupComponent;
    public prSizeLabelComponent: PrSizeLabelComponent;
    public weeklyReportComponent: WeeklyReportComponent;
    public welcomeInstallComponent: WelcomeInstallComponent;
}

export function initApplication(app: MyApplication) {
    app.utils = Utils;
    app.configService = new ConfigService(app, "configService");
    app.dataService = new DataService(app, "dataService");
    app.dingTalkNotifyService = new DingTalkNotifyService(app, "dingTalkNotifyService");
    app.eventService = new EventService(app, "eventService");
    app.installationsService = new InstallationsService(app, "installationsService");
    app.mailService = new MailService(app, "mailService");
    app.schedulerService = new SchedulerService(app, "schedulerService");
    app.translateService = new TranslateService(app, "translateService");
    app.blockUserComponent = new BlockUserComponent(app, "blockUserComponent");
    app.issueAutoLabelComponent = new IssueAutoLabelComponent(app, "issueAutoLabelComponent");
    app.issueTranslatorComponent = new IssueTranslatorComponent(app, "issueTranslatorComponent");
    app.labelSetupComponent = new LabelSetupComponent(app, "labelSetupComponent");
    app.prSizeLabelComponent = new PrSizeLabelComponent(app, "prSizeLabelComponent");
    app.weeklyReportComponent = new WeeklyReportComponent(app, "weeklyReportComponent");
    app.welcomeInstallComponent = new WelcomeInstallComponent(app, "welcomeInstallComponent");
}

export async function loadApplication(app: MyApplication) {
    await app.configService.onLoad();
    await app.dataService.onLoad();
    await app.dingTalkNotifyService.onLoad();
    await app.eventService.onLoad();
    await app.installationsService.onLoad();
    await app.mailService.onLoad();
    await app.schedulerService.onLoad();
    await app.translateService.onLoad();
    await app.blockUserComponent.onLoad();
    await app.issueAutoLabelComponent.onLoad();
    await app.issueTranslatorComponent.onLoad();
    await app.labelSetupComponent.onLoad();
    await app.prSizeLabelComponent.onLoad();
    await app.weeklyReportComponent.onLoad();
    await app.welcomeInstallComponent.onLoad();
}

export async function applicationStarted(app: MyApplication) {
    await app.configService.onStarted();
    await app.dataService.onStarted();
    await app.dingTalkNotifyService.onStarted();
    await app.eventService.onStarted();
    await app.installationsService.onStarted();
    await app.mailService.onStarted();
    await app.schedulerService.onStarted();
    await app.translateService.onStarted();
    await app.blockUserComponent.onStarted();
    await app.issueAutoLabelComponent.onStarted();
    await app.issueTranslatorComponent.onStarted();
    await app.labelSetupComponent.onStarted();
    await app.prSizeLabelComponent.onStarted();
    await app.weeklyReportComponent.onStarted();
    await app.welcomeInstallComponent.onStarted();
}
