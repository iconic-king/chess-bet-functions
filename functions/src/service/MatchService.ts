import { Alliance } from "../domain/Alliance"
import { Amount } from "./AccountService"
import { MatchType } from "../domain/MatchType"

export enum MatchStatus {
    DRAW = 'DRAW',
    TIMER_LAPSED = 'TIMER_LAPSED',
    ABANDONMENT = 'ABANDONMENT',
    GAME_ABORTED = 'GAME_ABORTED',
    DISCONNECTED = 'DISCONNECTED'
}

export interface MatchResult {
    matchId: string;
    matchStatus: MatchStatus;
    gain: string;
    loss: string;
    matchType: MatchType;
    amount: Amount | null;
    gainName: string,
    lossName: string,
    pgnText: string
    _id:string;
}

export const getResult = (matchResult: MatchResult, sideWon: Alliance): string => {
    if(matchResult.matchStatus === MatchStatus.ABANDONMENT) {
        return "*"
    } else if (matchResult.matchStatus === MatchStatus.DRAW) {
        return "1-2/1-2"
    } else {
        if(sideWon === Alliance.WHITE) {
            return "1-0"
        } else if (sideWon === Alliance.BLACK) {
            return "0-1"
        } else {
            return "*"
        }  
    }
}