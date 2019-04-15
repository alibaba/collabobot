import args from "args";
import * as fs from "fs";
import * as path from "path";

(() => {
    args.options([
        {
            name: ["s", "newService"],
            description: "Create a new service for your app, need to set the --name/-n arg."
        },
        {
            name: ["c", "newComponent"],
            description: "Create a new component for your app, need to set the --name/-n arg."
        },
        {
            name: ["n", "name"],
            description: "The name of your service or component."
        }
    ]);

    const flags = args.parse(process.argv);

    if (!flags.n) {
        console.error(`Name is needed for new component or service create.`);
        return;
    }

    if (!flags.s && !flags.c) {
        console.error(`You need to specify what kind of component you want to create.`);
        return;
    }

    let originName = <string>(flags.n);
    if (typeof (originName) !== "string") {
        console.error("Please pass the name of the service or component.");
        return;
    }
    let pathName = originName.charAt(0).toLowerCase() + originName.substring(1);
    let className = originName.charAt(0).toUpperCase() + originName.substring(1);
    let create = (dir: string, suffix: string) => {
        if (!fs.existsSync(dir)) {
            console.error(`${dir} not exists`);
            return;
        }
        let pathStat = fs.statSync(dir);
        if (!pathStat.isDirectory()) {
            console.error(`${dir} is not a directory`);
            return;
        }
        let newPath = path.join(dir, pathName);
        if (fs.existsSync(newPath)) {
            console.error(`${newPath} already exists.`);
            return;
        }

        let generateClassTemplate = (): string => {
            return `
import { BaseComponent } from "../../baseComponent";
import ${className}${suffix}Config from "./config";

export default class ${className}${suffix} extends BaseComponent {
    public async onLoad(): Promise<void> {
    }
}
`
        };

        let generateConfigTemplate = (): string => {
            return `
import { BaseComponentConfig } from "../../baseComponentConfig";

export default class ${className}${suffix}Config extends BaseComponentConfig {
    constructor() {
        super();
    }
}
`
        };

        fs.mkdirSync(newPath);
        let componentPath = path.join(newPath, "index.ts");
        fs.writeFileSync(componentPath, generateClassTemplate().trim());

        let configPath = path.join(newPath, "config.ts");
        fs.writeFileSync(configPath, generateConfigTemplate().trim());

        console.debug(`Create ${originName} done.`);
    };

    if (flags.s) {
        console.debug(`Gonna create new service, name=${originName}`);
        create("./src/services/", "Service");
    } else if (flags.c) {
        console.debug(`Gonna create new component, name=${originName}`);
        create("./src/components/", "Component");
    }

})();
