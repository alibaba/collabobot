// Base Event
export abstract class BaseEvent {

}

export class NewRepoInstalledEvent extends BaseEvent {
    owner: string;
    repo: string;
}

export class RepoUninstalledEvent extends BaseEvent {
    owner: string;
    repo: string;
}

export class ConfigChangedEvent extends BaseEvent {
    owner: string;
    repo: string;
}
