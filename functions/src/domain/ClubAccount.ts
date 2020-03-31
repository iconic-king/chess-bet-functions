import {PuzzleAccount}  from './Puzzle';
import { UserService } from '../service/AccountService';

export class ClubAccount {
    constructor(public owner: string, public clubId: string | number, public permissions: Array<Permissions>,
        public id: string, public servcieId: number, public status: Status, 
        public terms_of_servcie_accepted: boolean, public events: Array<Event>) {}
}


export enum Permissions {
    ADMIN = 'ADMIN',
    BLOG_UPDATE = 'BLOG_UPDATE',
    TOPIC_UPDATE = 'TOPIC_UPDATE',
    MEMBER = 'MEMBER',
    ARTICLE_CREATE = 'ARTICLE_CREATE'
}

export enum Event {
    CREATED = 'CREATED',
    CLOSED = 'CLOSED',
    PENDING = 'PENDING',
    TERMS_OF_SERVCIE_ACCEPTED = 'TERMS_OF_SERVCIE_ACCEPTED'
}

export enum Status {
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    CLOSED = 'CLOSED',
    PENDING = 'PENDING',
}

export class ClubAccoutInfo {
    public clubAccount: ClubAccount | undefined;
    public puzzleAccount: PuzzleAccount | undefined;
    public user: UserService | undefined;
}