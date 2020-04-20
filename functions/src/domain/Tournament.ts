/**
 * @autor Collins Magondu 04/20/2020
 * Desctiption of classes are in TPS App
 */

import { ParingAlgorithm } from "./ParingAlgorithm";

export class Tournament {
    public authorUid: string | undefined;
    public id: string | undefined;
    public name!: string;
    public city!: string;
    public federation!: string;
    public dateOfStart!: string;
    public numberOfPlayers!: number;
    public numberOfRatedPlayers!: number;
    public numberOfTeams!: number;
    public typeOfTournament!: string;
    public paringAlgorithm: ParingAlgorithm = ParingAlgorithm.SWISS  // By Defualt Use Standard Swiss
    public chiefArbiter!: string;
    public deputyArbiter!: string;
    public allottedTimes!: string;
    public rounds!: string;
    public isLocked = false;
}

/**
 * Follows FIDE swiss specification
 */
export class PlayerSection {
    public accountId: string | undefined;
    public uid: string | undefined;
    public id: string | undefined = "001";
    public rankNumber: number | undefined = 0;
    public sex: string | undefined;
    public title: string | undefined;
    public name: string | undefined;
    public FIDERating: number = 0;
    public FIDEFederation: string | undefined;
    public FIDENumber: number = 0;
    public birthDate: string | undefined;
    public points: number = 0;
    public rank: number = 0;
    public rounds: Array<Round> = new Array();
}

export class Round {
    public playerNumber: string | undefined;
    public scheduledColor: string | undefined;
    public result: string | undefined;
}


export class SwissTeam {
    public id: string = "013";
    public name: string | undefined;
    public playerRanks: Array<number> = new Array();
}

export class SwissTournament extends Tournament {
    public teams: Array<SwissTeam> = new Array();
    public players: Array<PlayerSection> = new Array();
}