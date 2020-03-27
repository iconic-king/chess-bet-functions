import { MatchType } from "./MatchType";
/**
 * @author Collins Magondu
 */
export interface Challenge {
    owner: string; // Creator of the challenge
    matchType: MatchType;
    requester: string; // Accepted the challange
    timeStamp: number;
    accepted: boolean;
    duration: number; // Min
    eloRating: number;
    minEloRating: number;
    maxEloRating: number;
    type: Type;
}

export enum ChallengeResponse {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    ERROR = 'ERROR'
}


/**
 * Challenge Transfer Object. Allows us to recieve challenge requests from clients
 */
export class ChallengeDTO{
    constructor(public owner:string, public duration: number,
        public eloRating: number, public type: Type, public minEloRating: number, public maxEloRating: number){}
}

/**
 * Challenge Types Identifies the challenge reciver
 */
export enum Type {
    FRIENDLY = 'FRIENDLY',
    CHALLENGE = 'CHALLENGE'
}