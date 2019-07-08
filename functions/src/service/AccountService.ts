import { MatchType } from "../domain/MatchType";

export interface AccountService{
    amount: number;
    currency: string;
    terms_condition_accepted:boolean;
    date_created: string;
    events: Array<Event>;
    last_date_modified: string;
    status: AccountStatus;
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

export interface MatchService{
    match_type : MatchType,
    status: string,
    players : {
      BLACK : {
         owner :string
         from : number;
         to: number;
      }
      WHITE :{
        owner :string
        from : number;
        to: number;
      }
    },
    events : Array<string> 
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

enum AccountStatus{
    PENDING,
    ACTIVE,
    SUSPENDED
}

export enum MatchStatus{
    IN_PROGRESS,
    FINISHED,
    INTERUPPTED
}

