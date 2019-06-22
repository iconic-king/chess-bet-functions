import { MatchType } from "../domain/MatchType";

export interface AccountService{
    amount: number;
    currency: string;
    terms_condition_accepted:boolean;
    date_created: string;
    events: Array<Event>;
    last_date_modified: string;
    status: Status;
    owner: string;
    elo_rating:number;
}

interface MatchableAccountService{
    owner: string;
    matchable :boolean;
    matched :boolean;
    elo_rating: number;
    match_type: MatchType;
}
export class MatchableAccount implements MatchableAccountService{
    owner: string;
    matchable: boolean;
    matched: boolean;
    elo_rating: number;
    match_type: MatchType;
    online:boolean;
    constructor(owner: string,matchable :boolean, matched :boolean,
        elo_rating: number,match_type: MatchType,online:boolean){
           this.owner = owner;
           this.matchable = matchable;
           this.elo_rating = elo_rating;
           this.matched = matched;
           this.match_type = match_type;
           this.online = online; 
    }
}

export class MatchablePlayOnlineAcount extends MatchableAccount{ 
}


interface Event {
    name:string;
    date_created: string;
    done :boolean;
}

enum Status{
    PENDING,
    ACTIVE,
    SUSPENDED
}