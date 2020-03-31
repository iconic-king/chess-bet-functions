export class PuzzleAccount {
    public points: number | undefined;
    public ownerUID: string | undefined;
    public solvedPuzzles: Array<PuzzleResult> = new Array();
    public failedPuzzles: Array<PuzzleResult> = new Array();
}

export class PuzzleResult {
    public puzzleName: string | undefined;
    public puzzleDescription: string | undefined;
    public puzzleId: string | undefined;
    public points: number | undefined;
    public puzzleRetries = 0;
}
