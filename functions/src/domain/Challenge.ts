import { MatchType } from "./MatchType";

/**
 * Challenge Types Identifies the challenge reciver
 */
export enum Type {
    FRIENDLY = 'FRIENDLY',
    CHALLENGE = 'CHALLENGE'
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
        type: type
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