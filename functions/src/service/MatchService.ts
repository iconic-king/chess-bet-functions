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
    pgnText: string
    _id:string;
}