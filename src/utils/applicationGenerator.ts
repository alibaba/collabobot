import * as path from "path";
import * as fs from "fs";
import * as os from "os";

(async () => {
    let servicesDir = path.join(__dirname, "../../src/services");
    let componentsDir = path.join(__dirname, "../../src/components");
    let outputPath = path.join(__dirname, "../../src/myApplication.ts");

    type component = {
        name: string,
        priority: number
    }
    let services: Array<component> = [];
    let components: Array<component> = [];
    let priority: Map<string, number> = new Map<string, number>();

    let setPriority = () => {
        priority.set("config", 99);
    };

    setPriority();

    let loadDir = (dir: string, pushFunc: (name: string, priority: number) => void) => {
        if (!fs.existsSync(dir)) return;
        let list = fs.readdirSync(dir);
        for (let i = 0; i < list.length; i++) {
            let name = list[i];
            let directoryPath = path.join(dir, name);
            let stat = fs.statSync(directoryPath);
            if (stat && stat.isDirectory()) {
                let p = priority.get(name);
                if (p) pushFunc(name, p);
                else pushFunc(name, 0);
            }
        }
    }

    loadDir(servicesDir, (name: string, priority: number): void => { services.push({ name, priority }); });
    loadDir(componentsDir, (name: string, priority: number): void => { components.push({ name, priority }); });

    let sortFunc = (a: component, b: component) => b.priority - a.priority;
    services.sort(sortFunc);
    components.sort(sortFunc);

    let capitalize = (str: string): string => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    let genImportClause = (name: string, dir: string, suffix: string) => {
        return `import ${capitalize(name)}${suffix} from "./${dir}/${name}";`;
    }
    let importClauses = services.map(comp => genImportClause(comp.name, "services", "Service")).
        concat(components.map(comp => genImportClause(comp.name, "components", "Component"))).join(os.EOL);

    let genDeclareClause = (name: string, suffix: string) => {
        return `    public ${name}${suffix}: ${capitalize(name)}${suffix};`;
    }
    let declareClauses = services.map(comp => genDeclareClause(comp.name, "Service")).
        concat(components.map(comp => genDeclareClause(comp.name, "Component"))).join(os.EOL);

    let genInitClause = (name: string, suffix: string) => {
        return `    app.${name}${suffix} = new ${capitalize(name)}${suffix}(app, "${name}${suffix}");`;
    }
    let initClauses = services.map(comp => genInitClause(comp.name, "Service")).
        concat(components.map(comp => genInitClause(comp.name, "Component"))).join(os.EOL);

    let genLoadClause = (name: string, suffix: string) => {
        return `    await app.${name}${suffix}.onLoad();`;
    }
    let loadClauses = services.map(comp => genLoadClause(comp.name, "Service")).
        concat(components.map(comp => genLoadClause(comp.name, "Component"))).join(os.EOL);

    let genStartClause = (name: string, suffix: string) => {
        return `    await app.${name}${suffix}.onStarted();`;
    }
    let startClauses = services.map(comp => genStartClause(comp.name, "Service")).
        concat(components.map(comp => genStartClause(comp.name, "Component"))).join(os.EOL);

    let fileContent = `import { Application } from "probot";
import { Config } from "./config";
import Utils from "./utils/utils";
${importClauses}

export class MyApplication extends Application {
    public config: Config;
    public utils = Utils;
${declareClauses}
}

export function initApplication(app: MyApplication) {
    app.utils = Utils;
${initClauses}
}

export async function loadApplication(app: MyApplication) {
${loadClauses}
}

export async function applicationStarted(app: MyApplication) {
${startClauses}
}
`;

    fs.writeFileSync(outputPath, fileContent);

})();