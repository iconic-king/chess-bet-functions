import { Tournament } from "./Tournament";

export class Pair {
    public whitePlayer!: number;
    public blackPlayer!: number;
}

export class ParingOutput {
    public tournament: Tournament | undefined;
    public pairs: Array<Pair>  = new Array();  
}

/**
 * Paring output returned by TPS
 */
export class SwissParingOutput extends ParingOutput{
    public noPairs: number | undefined = 0;
}