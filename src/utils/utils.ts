import { Context } from "probot";

const waitFor = require("p-wait-for");
const { pope } = require("pope");

export class Locker {

    private locker: Map<string, boolean> = new Map<string, boolean>();
    public checkLocked(key: string): boolean {
        if (!this.locker.has(key)) {
            this.locker.set(key, true);
            return false;
        }
        return this.locker.get(key);
    }

    public async waitLock<T>(key: string, func: () => Promise<T>): Promise<T> {
        await Utils.waitFor(() => !this.checkLocked(key));
        let ret = await func();
        this.releaseLock(key);
        return <T>ret;
    }

    public releaseLock(key: string): void {
        this.locker.set(key, false);
    }
}

export default class Utils {
    static getOwnerAndRepoByFullName(fullName: string): { owner: string, repo: string } {
        let s = fullName.split("/");
        if (s.length !== 2) return null;
        return {
            owner: s[0],
            repo: s[1]
        }
    }

    static genRepoFullName(owner: string, repo: string): string {
        return `${owner}/${repo}`;
    }

    static getOwnerAndRepoByContext(context: Context): { owner: string, repo: string } {
        return {
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name
        }
    }

    static waitFor(func: () => boolean, options?: Object): Promise<void> {
        return waitFor(func, Object.assign({ interval: 1000 }, options));
    }

    static renderString(template: string, param: any): string {
        return pope(template, param);
    }

    static genLocker(): Locker {
        return new Locker();
    }

    static uniqueArray<T>(arr: Array<T>): Array<T> {
        let unique = (value: T, index: number, self: Array<T>) => {
            return self.indexOf(value) === index;
        }
        return arr.filter(unique);
    }

    static getLastWeek(): Date {
        return new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
    }

}
