import { MatchType } from "../domain/MatchType";
import { MatchResult } from "./MatchService";

export interface UserService{
    email: string | undefined,
    uid: string,
    disabled: boolean,
    date_created: string,
    date_modified: string,
    user_name: string;
    profile_photo_url:string
}

export interface AccountService{
    amount: number;
    currency: string;
    terms_condition_accepted:boolean;
    date_created: string;
    events: Array<AccountEvent>;
    last_date_modified: string;
    status: AccountStatus;
    owner: string;
    elo_rating:number;
    matches: Array<MatchDetailsService>;
}

interface MatchableAccountService{
    owner: string;
    matchable :boolean;
    matched :boolean;
    elo_rating: number;
    match_type: MatchType;
    date_created: string;
}

export interface MatchService{
    match_type : MatchType,
    players : {
      BLACK : {
         owner :string;
         from : number;
         to: number;
         events : Array<MatchEvent> ;
      }
      WHITE :{
        owner :string
        from : number;
        to: number;
        events : Array<MatchEvent>;
      }
    }
}
/**
 *  Will be used by the endpoint to get match details while also passing the result
 */

 interface Player{
    owner :string;
    events : Array<MatchEvent> ;
    elo_rating: number;
    type: string;
 }


export interface MatchDetailsService {
    match_type: MatchType;
    match_result: MatchResult; 
    players : Array<Player>;
}

export class MatchableAccount implements MatchableAccountService{
    date_created: string;
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
           this.date_created = new Date().toLocaleString();
    }
}

export class MatchablePlayOnlineAccount extends MatchableAccount{ 
}


export class MatchedPlayOnlineAccount extends MatchablePlayOnlineAccount{
    opponent : string;
    matchId: string;
    constructor (owner: string,matchable :boolean, matched :boolean,
        elo_rating: number,match_type: MatchType,online:boolean,
        opponent: string, matchId: string){
            super(owner, matchable, matched, elo_rating, match_type, online);
            this.matchId = matchId;
            this.opponent = opponent;
        }
}

export interface AccountEvent {
    name:string;
    date_created: string;
    done :boolean;
}

export enum AccountStatus{
    PENDING,
    ACTIVE,
    SUSPENDED
}

export enum MatchEvent{
    IN_PROGRESS,
    FINISHED,
    INTERUPPTED,
    TIMELAPSED
}

export interface MatchRange {
    start_at: number;
    end_at: number;
}

