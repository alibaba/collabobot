// The config file of collabobot, use this template to set your config and put it in your repo at /.github/collabobot.js
// You can change any config field to fit your need
// You can delete any config field if the default value meets your need
module.exports = {
    // services
    dataService: {
        // data service auto update date time, default value: "0 6 * * *"
        updateTime: "0 6 * * *",
        // schedule job name of data update, default value: "DataUpdate"
        jobName: "DataUpdate",
        dataFetch: {
            // the token you use to fetch data from GitHub, default value: []. Please config this on your server side.
            tokens: string[]
        }
    },
    translateService: {
        // issue translator component depends on translate service, default value: false
        enable: true,
        // the google translation key for google translate service, default value: []. Please config this on your server side.
        googleTranslationKey: ""
    },
    mailService: {
        // some mail notify component depends on mail service, default value: false
        enable: true,
        // connection options for mail serivce, default value: {}. Please config this on your server side.
        connectOptions: {
            host: "smtp.xxx.com",
            port: 465,
            secure: true,
            auth: {
                user: "user@xxx.com",
                pass: "YourPassword"
            }
        },
        // default send options of mail service, default value: () => { return {}; }
        generateDefaultSendOptions: () => {
            return {
                from: "User<user@xxx.com>",
                to: []
            }
        }
    },
    dingTalkNotifyService: {
        // some dingtalk group component depends on dingtalk service, default value: false
        enable: true,
        // dingtalk group notify webhook URL, default value: "". Please config this on your server side.
        webhook: "Your dingtalk group webhook URL"
    }

    // components
    labelSetupComponent: {
        // enable to get the auto label ability of issue, default value: false
        enable: true,
        // custom label for this repo, default value: []
        customLabels: [
            {
                // name of your custom label
                name: "area/sample",
                // description of your custom label
                description: "Category issues or prs related to sample.",
                // color of your custom label, "0366d6" for area labels by default
                color: "0366d6",
                // keywords to support auto label component, should be all lowercase
                keywords: ["sample"]
            }
        ]
    },
    issueAutoLabelComponent: {
        // enable to get the auto label ability of issue, default value: false
        enable: true,
        // when issue will not be auto labeld, default value: () => false
        notProcess: (title, body, author) => body.includes("/nolabel")
    },
    weeklyReportComponent: {
        // enable to get the weekly report ability, default value: false
        enable: true,
        // weekly report generate time, default value: "0 14 * * 5"
        generateTime: "0 15 * * 5",
        // repo alias in weekly report, if not set, use repo name, default value: ""
        repoAlias: ""
    },
    prSizeLabelComponent: {
        // enable to get pr size auto label ability, default value: false
        enable: true,
        // modify lines for each label, default value as shown below
        xsSizeLines: 10,
        sSizeLines: 30,
        mSizeLines: 100,
        lSizeLines: 500,
        xlSizeLines: 1000
    },
    issueTranslatorComponent: {
        // enable to get issue auto translate ability, default value: false
        enable: true,
        // the object language you want, default value: "en"
        to: "en",
        // when issue will not be translated, default value: () => false
        notProcess: (title, body, author) => body.includes("/notranslate")
    },
    blockUserComponent: {
        // enable to block a GitHub user from the community, default value: false
        enable: true,
        blockUsers: [{
            id: "some_one's_github_id";
            block: {
                openIssue: true;
                issueComment: true;
                openPullRequest: true;
            };
            reason: "Public harassment";
        }];
        // following template is used for issue or pr update
        // issueCloseCommentTemplate: string;
        // pullRequestCloseCommentTemplate: string;
        // commentDeleteTemplate: string;
    }
};
