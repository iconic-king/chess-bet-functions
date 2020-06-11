import { MatchType } from "./MatchType";
import { Amount } from "../service/AccountService";

/**
 * Challenge Types Identifies the challenge reciver
 */
export enum Type {
    FRIENDLY = 'FRIENDLY',
    CHALLENGE = 'CHALLENGE',
    BET_FRIENDLY = 'BET_FRIENDLY',
    BET_CHALLENGE = 'BET_CHALLENGE',
}

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
    amount: number;
    currency: string;
}

export const CreateTargetChallengeFactory = (owner: string, matchType: MatchType, target: string , duration: number, type: Type) => {
    return <Challenge> {
        owner: owner,
        matchType: matchType,
        requester: target,
        timeStamp: new Date().getTime(),
        accepted: true,
        duration: duration,
        eloRating: 0,
        minEloRating: 0,
        maxEloRating: 0,
        type: type,
        amount: 0,
        currency: 'KES'
    }
}

export interface TargetedChallenge {
    id: string;
    owner: string;
    ownerName: string;
    matchType: MatchType;
    target: string;
    targetName: string;
    accepted: boolean;
    timeStamp: number;
    dateCreated: string;
    users: Array<string>; // Used to fetch queries collectively
    amount: number;
    currency: string;
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
        public eloRating: number, public type: Type, public minEloRating: number, public maxEloRating: number, public amount: Amount){}
}