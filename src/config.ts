import _ from "lodash";
import * as fs from "fs";
import * as path from "path";

class Config {
    // webhook path for github
    public webhookPath: string = "/webhook";
    // listen port for web
    public port: number = 5000;
    // smee webhook proxy address
    public webhookProxy: string;
    // webhook secret
    public secret: string;
    // app id
    public id: number;
    // certificate key
    public cert: string;
    // global config file path in local
    public globalConfigPath: string = "../globalConfig.js";
    private globalConfigRequiredFields: string[] = ["secret", "id", "cert"];

    public customConfigDir: string = "../configs";
    public servicesDir: string = "./services";
    public componentDir: string = "./components";

    public repoConfigPath: string = ".github/collabobot.js";
    // index entry for every config field
    [key: string]: any

    constructor() {
        // global config path can be changed via command line param
        // while other config can be changed via global config file
        if (process.argv[2]) {
            this.globalConfigPath = process.argv[2];
        }
        this.globalConfigPath = path.join(__dirname, this.globalConfigPath);
        this.loadGlobalConfig();
        this.postProcess();
    }

    private loadGlobalConfig(): void {
        if (fs.existsSync(this.globalConfigPath)) {
            let globalConfig = require(this.globalConfigPath);

            // Check global config required fields
            let checkConfig = (index: string) => {
                if (!globalConfig[index]) {
                    throw `No ${index} found in your config, please check your config.`;
                }
            }
            this.globalConfigRequiredFields.forEach(checkConfig);

            // global config to this
            for (let i in globalConfig) {
                this[i] = globalConfig[i];
            }
        } else {
            throw `No config file found in ${this.globalConfigPath}`;
        }
    }

    private postProcess(): void {
        let checkFileExists = (path: string): void => {
            if (!fs.existsSync(path)) {
                let err = `File ${path} not exists`;
                throw err;
            }
        }

        this.customConfigDir = path.join(__dirname, this.customConfigDir);
        this.servicesDir = path.join(__dirname, this.servicesDir);
        this.componentDir = path.join(__dirname, this.componentDir);
        let certFilePath = path.join(path.dirname(this.globalConfigPath), this.cert);
        let needCheck = [this.customConfigDir, this.servicesDir, this.componentDir, certFilePath];
        needCheck.forEach(checkFileExists);

        // read cert file into cert field
        this.cert = fs.readFileSync(certFilePath).toString();
    }

}

export { Config }
