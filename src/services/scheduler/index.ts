import { BaseComponent } from "baseComponent";
import scheduler, { JobCallback, Job } from "node-schedule";

export default class SchedulerService extends BaseComponent {
    register(name: string, time: string, func: JobCallback): Job {
        this.logger.info(`Register ${name} job, time=${time}`);
        return scheduler.scheduleJob(name, time, (date: Date) => {
            this.logger.info(`Scheduling job name=${name}`);
            func(date);
        });
    }
}
