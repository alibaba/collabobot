# Collabobot

![Collabobot Banner](docs/static/banner.png)

Collabobot is short for collaborate robot which is for GitHub open source project collaboration. This project is a [GitHub App](https://developer.github.com/v3/apps/) that you can easily install for your repos.

Collabobot is built on [Probot](https://github.com/probot/probot) which is a great framework to build GitHub App and collabobot has its own advantages which will be introduced in this doc.

## To start using Collabobot

Collabobot is written in pure [TypeScript](https://github.com/Microsoft/TypeScript) to improve development speed and quality.

All dependent modules are listed in [`package.json`](./package.json), so the only environment you need is Node.js and latest npm. Run `npm install` after cloning the project and add a `globalConfig.js` file to configure your robot, the content of the config file should be like below, and you can find a sample config in [`globalConfigTemplate.js`](./globalConfigTemplate.js):

``` JavaScript
module.exports = {
    webhookPath: "/event",
    port: 5000,
    webhookProxy: your_smee_url,
    id: your_app_id,
    secret: your_app_secret,
    cert: your_pem_file_path
};
```

The only required config fields are `id`, `secret` and `cert`.

* `id` is the GitHub App id of your installed app, you can find it in the general setting page of your app.
* `secret` is the `webhook secrect` of your app, you can set it in the general setting page of your app.
* `cert` is the cert file path of your app, this cert file will be used to authenticate your app, it can be generated in your general setting page of your app.

> All the required field can be found, set or generate in your app general setting page, which would be like [https://github.com/settings/apps/your_app_name](https://github.com/settings/apps) for personal account or [https://github.com/organizations/your_org_name/settings/apps/your_app_name](https://github.com/settings/apps) for orgs.

### Run the robot

After creating the config file, just run `npm start` to start the robot and you can use whatever tools you need to make the robot daemon(pm2/forever/nohup).

You can also run the robot by [Docker](https://www.docker.com/), we provide `Dockerfile` to run the project, use `docker build` to build the image and use `docker run` to run the image. Notice that the port exposed is 5000 by default.

## To start developing Collabobot

The framework of this robot only provides some basic services, you can use all these services to develop your own component.

The services contains:

### HTTP routes

This robot uses Probot to provide web access ability, you can access to the probot app via `this.app` in any component and use `this.app.route` to mount a new http access point. See [Probot doc](https://probot.github.io/docs/http/).

### GitHub webhook service

This robot uses Probot to provide GitHub webhook service, you can use `this.app.on(event, func)` to register your logic on events. See [Probot doc](https://probot.github.io/docs/webhooks/).

### GitHub service

This robot uses Probot to provide GitHub request ability, you can use `this.app.installationsService.getGithubClient(owner: string, repo: string)` to get a valid GitHub client to invoke a request or you can use `context.github` to get a valid GitHub client for current context if you have the context.

Then the GitHub client is a client which can make all API requests, see [Probot doc](https://probot.github.io/docs/github-api/).

### Scheduler service

Scheduler service is for tasks which will schedule in the future. This robot uses [`node-schedule`](https://github.com/node-schedule/node-schedule) to manage the tasks which is compatible with `crontab` time format.

You can use `this.app.schedulerService.register(name: string, time: string, (date: Date) => void);` to register a schedule task, and this function will return a `Job` handler that you can use to cancle the job.

### Event service

Event service is very important in the framework. This service is used to subscribe and publish an event with certain context.

Notice that the event service uses class type to trigger and dispatch events. All the event types should add into `services/event/events.ts` and derived from `BaseEvent` and the param of the handler is also the class type.

Then you can use `this.app.eventService.on(EventType, (event: EventType) => void);` to register your handler for a specific event type and use `this.app.eventService.trigger(EventType, event);` to trigger an event. When an event is triggered, all listened handlers will be called with the event param.

### Data service

Data service provides basic repo data for all services and components.

Repo data includes repo basic info, all star, watch, fork, contributor, issue, pull requests data. The data will regularly updated due to the config and listen to web hook to update data. So the data in data service is up-to-date and can be used any time.

You can access the repo data via `this.app.dataService.getRepoData(owner: string, repo: string)` and you can get detail info of user data via `this.app.dataService.getUserData(login: string)`.

### Mail service

Mail service provide basic mail send service for the app.

We use [nodemailer](https://github.com/nodemailer/nodemailer) as our mail client. You can use `this.app.mailService.send(options: Nodemailer.SendMailOptions)` to send a mail and use `this.app.mailService.getDefaultSendOptions() => Nodemailer.SendMailOptions` to get a default config which is a function configured in config files(default return an empty object).

### Translate service

Translate service provides translation services using [Google Translation API](https://cloud.google.com/translate/).

This service only uses API key in authentication, so you need to provide a Google translation API key to init the service. Then you can use `this.app.translateService.translate(strings: string, target: string) => Promise<TranslateResult>` or `this.app.translateServiec.translateArray(strings: string[], target: string): Promise<TranslateResult[]>` to get one or more translation results and `this.app.translateService.detect(strings: string): Promise<DetectResult>` to detect language of the input.

### DingTalk notify service

DingTalk notify service gives basic ability to notify messages with DingTalk group robot.

You can use several functions to send all kinds of messages to DingTalk group robot, see: [https://open-doc.dingtalk.com/docs/doc.htm](https://open-doc.dingtalk.com/docs/doc.htm).

## Support

If you have any questions or feature requests, please feel free to submit an issue.
