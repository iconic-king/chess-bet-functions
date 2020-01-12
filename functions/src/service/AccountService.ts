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
    status: string;
    owner: string;
    elo_rating:number;
    last_matchable_time: number;
    last_match_type: MatchType;
    last_match_duration: number;
    last_match_amount: Amount;
    matched: boolean;
    matches: Array<MatchDetailsService>;
    current_challenge_id:string;
    current_challenge_timestamp: number;
}

interface MatchableAccountService{
    owner: string;
    matchable :boolean;
    matched :boolean;
    elo_rating: number;
    match_type: MatchType;
    date_created: string;
    duration:number;
}

export interface Amount {
    currency: string;
    amount: number;
}
// Match interface should be PGN and FEN compatible
export interface MatchService{
    match_type : MatchType,
    players : {
      BLACK : {
         owner :string;
         from : number;
         to: number;
         pgn: string;
         gameTimeLeft: number; // Usefull in controlling the timer
         events : Array<MatchEvent> ;
      }
      WHITE :{
        owner :string
        from : number;
        to: number;
        pgn: string;
        gameTimeLeft: number; // Usefull in controlling the timer
        events : Array<MatchEvent>;
      }
    }
    scheduleEvaluation:boolean; // Used for immediate evaluation of a match
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
    matchPgn: string; //Match PGN String
}

export class MatchableAccount implements MatchableAccountService{
    duration: number;
    date_created: string;
    owner: string;
    matchable: boolean;
    matched: boolean;
    elo_rating: number;
    match_type: MatchType;
    online:boolean;
    constructor(owner: string,matchable :boolean, matched :boolean,
        elo_rating: number,match_type: MatchType,online:boolean, duration: number){
           this.owner = owner;
           this.matchable = matchable;
           this.elo_rating = elo_rating;
           this.matched = matched;
           this.match_type = match_type;
           this.online = online;
           this.duration = duration; 
           this.date_created = new Date().toLocaleString();
    }
}

export class MatchablePlayOnlineAccount extends MatchableAccount{ 
}


export class MatchedPlayOnlineAccount extends MatchablePlayOnlineAccount{
    opponent : string;
    opponentId: string;
    matchId: string;
    constructor (owner: string,matchable :boolean, matched :boolean,
        elo_rating: number,match_type: MatchType,online:boolean,
        opponent: string, matchId: string, duration: number, opponentId: string){
            super(owner, matchable, matched, elo_rating, match_type, online, duration);
            this.matchId = matchId;
            this.opponent = opponent;
            this.opponentId = opponentId;
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

