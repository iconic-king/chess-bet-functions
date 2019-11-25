import { MatchType } from "./MatchType";
/**
 * @author Collins Magondu
 */
export interface Challenge{
    owner: string; // Creator of the challenge
    matchType: MatchType;
    requester: string; // Accepted the challange
    timeStamp: number;
    accepted: boolean;
    duration: number; // Min
    eloRating: number;
}