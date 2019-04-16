import { BaseComponent } from "baseComponent";
import { BaseEvent } from "./events";

export interface EventHandler<T> {
    (param: T): void;
}

export default class EventService extends BaseComponent {
    private handlersMap: Map<Object, Array<any>> = new Map<Object, Array<any>>();

    on<T extends BaseEvent>(constructor: { new(...args: any): T }, func: EventHandler<T>): void {
        let found = false;
        for (let key of this.handlersMap.keys()) {
            if (key instanceof constructor) {
                this.handlersMap.get(key).push(func);
                found = true;
                break;
            }
        }
        if (!found) {
            let key = new constructor();
            this.handlersMap.set(key, Array.of(func));
        }
    }

    trigger<T extends BaseEvent>(constructor: { new(...args: any): T }, param: T): void {
        for (let entry of this.handlersMap) {
            let key = entry[0];
            let value = entry[1];
            if (key instanceof constructor) {
                value.forEach(func => {
                    (<EventHandler<T>>func)(param);
                });
            }
        }
    }
}
