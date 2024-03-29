import { MatchType } from "../domain/MatchType";
import { MatchResult } from "./MatchService";
import { Alliance } from "../domain/Alliance";


export interface UserService{
    email: string | undefined,
    uid: string,
    disabled: boolean,
    date_created: string,
    date_modified: string,
    user_name: string;
    fcmToken: string;
    profile_photo_url:string
    permissions: Array<Permission>
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
    matches: Array<MatchDetailsService>;
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

// TODO: Add promoted peice
export interface MatchService {
    match_type : MatchType,
    players : {
      BLACK : {
         owner :string;
         from : number;
         to: number;
         pgn: string;
         gameTimeLeft: number; // Usefull in controlling the timer
         events : Array<MatchEvent>;
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
    dateCreated: string;
    amount: Amount | null;
    matchPgn: string; //Match PGN String
}

export class MatchableAccount implements MatchableAccountService {
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

export class MatchablePlayOnlineAccount extends MatchableAccount {
}


export class MatchedPlayOnlineAccount extends MatchablePlayOnlineAccount {
    opponent : string;
    opponentId: string;
    matchId: string;
    timeStamp: number;
    constructor (owner: string,matchable :boolean, matched :boolean,
        elo_rating: number,match_type: MatchType,online:boolean,
        opponent: string, matchId: string, duration: number, opponentId: string, timeStamp: number){
            super(owner, matchable, matched, elo_rating, match_type, online, duration);
            this.matchId = matchId;
            this.opponent = opponent;
            this.opponentId = opponentId;
            this.timeStamp = timeStamp;
        }
}


export class MatchableBetOnlineAccount extends MatchableAccount {
    public amount!: number;
    public currency!: string;
}

/**
 * Matchable Account Used For Online Tournament
 */
export class MatchablePlayOnlineTournamentAccount extends MatchablePlayOnlineAccount {
    public isForTournament = true
    public timeStamp: number | undefined;
    public createdByUID : string | undefined;
    public tournamentId: string  | undefined;
    public email: string | undefined; // Used for notification of a match
}

// Based on swiss
export class MatchedPlayOnlineTournamentAccount extends MatchedPlayOnlineAccount {
    public currentRound!: number;
    public oppenentRank!: number;
    public result!: string;
    public sidePlayed!: Alliance;
    public isForTournament = true
    public createdByUID : string | undefined;
    public tournamentId: string  | undefined;
    public email: string | undefined; // Used for notification of a match 
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

export enum Permission {
    'TOPIC_UPDATE',
    'BLOG_UPDATE',
    'CLUB_UPDATE'
}

