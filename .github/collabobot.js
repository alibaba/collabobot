module.exports = {
    // services
    dataService: {
        enable: true,
        updateTime: "0 6 * * *"
    },
    translateService: {
        enable: true
    },

    // components
    labelSetupComponent: {
        enable: true,
        customLabels: [
            {
                name: "area/translation",
                description: "Category issues or prs related to translation.",
                color: "0366d6",
                keywords: ["translation", "translate"]
            },
            {
                name: "area/weekly-report",
                description: "Category issues or prs related to weekly report.",
                color: "0366d6",
                keywords: ["weeklyreport", "weekly-report", "weekly report"]
            },
            {
                name: "area/mail",
                description: "Category issues or prs related to mail service.",
                color: "0366d6",
                keywords: ["mail"]
            },
            {
                name: "area/label",
                description: "Category issues or prs related to label.",
                color: "0366d6",
                keywords: ["label"]
            },
            {
                name: "area/commandline",
                description: "Category issues or prs related to commandline.",
                color: "0366d6",
                keywords: ["commandline", "command-line", "command line"]
            }
        ]
    },
    issueAutoLabelComponent: {
        enable: true,
        notProcess: (title, body, author) => body.includes("/nolabel")
    },
    weeklyReportComponent: {
        enable: true,
        generateTime: "0 15 * * 5"
    },
    prSizeLabelComponent: {
        enable: true
    },
    issueTranslatorComponent: {
        enable: true,
        notProcess: () => false
    },
    blockUserComponent: {
        enable: true,
        blockUsers: [{
            id: "Frankzhaopku",
            block: {
                openIssue: true,
                issueComment: true,
                openPullRequest: true
            },
            reason: "Public harassment"
        }]
    }
}
