/**
 * @autjor Collins Magondu 04/20/2020
 */
import * as admin from 'firebase-admin';
import { SwissTournament, PlayerSection, Tournament, Round } from '../domain/Tournament';
import { ParingAlgorithm } from '../domain/ParingAlgorithm';
import { MatchablePlayOnlineTournamentAccount, MatchedPlayOnlineAccount, MatchedPlayOnlineTournamentAccount } from '../service/AccountService';
import { MatchType } from '../domain/MatchType';
import { ParingOutput, Pair } from '../domain/ParingOutput';
import { createMatchedPlayTournamentAccount, createMatch } from './MatchRepository';
import { Alliance } from '../domain/Alliance';

const firestoreDatabase = admin.firestore();
const realtimeDB = admin.database();

const tournamentCollection = "tournaments";

const createMatchableAccountFromPlayer = (player: PlayerSection, tournamentDuration: number): MatchablePlayOnlineTournamentAccount | null => {
    if(player.uid && player.email) {
       const matchableAccount = new MatchablePlayOnlineTournamentAccount(player.uid, true, false, 0, MatchType.PLAY_ONLINE, false, tournamentDuration)
       matchableAccount.email = player.email;
       matchableAccount.duration = tournamentDuration;
       matchableAccount.tournamentId = player.tournamentId;
       matchableAccount.timeStamp = new Date().getTime();
       return matchableAccount;
    }
    return null;
   }
   

export const createMatchAbleAccountsForPlayers = async (players: Array<PlayerSection>, duration: number) => {
    const map =  {};
    try {
        if(!players) {
            return null;
        }
        for (const player of players) {
            const matchable = createMatchableAccountFromPlayer(player, duration);
            if(player.uid && matchable){
                map[player.uid]  = matchable;
            } else {
                return null;
            }
        }
        // Matchables created successfully
        console.log(map);
        await realtimeDB.ref().child('matchables').set(map);
    } catch(error) {
        console.error(error);
    }
    return map;
}

export const  createSwissTournament = async (tournament :SwissTournament) => {
    tournament.id = firestoreDatabase.collection(tournamentCollection).doc().id
    tournament.timeStamp = new Date().getTime();
    tournament.dateOfStart = new Date().toLocaleDateString();
    tournament.matchDuration = (tournament.matchDuration) ? tournament.matchDuration : 5;
    let index = 1;
    for(const player of tournament.players) {
        player.tournamentId = tournament.id
        player.rankNumber = index;
        if(!player.uid || !player.email) {
            return null;
        }
        index++;
    }

    if(tournament.players && tournament.players.length > 0) {
        // Set Player Matchable accounts used for matching
        await createMatchAbleAccountsForPlayers(tournament.players, tournament.matchDuration);
    }
    return firestoreDatabase.collection(tournamentCollection).doc(tournament.id).set(tournament);
}

/**
 * Add tournament to players and assigns rankNumbers to the players
 * @param tournamentId
 * @param players
 */
export const addPlayersToTournament = async (tournamentId: string ,players: Array<PlayerSection>) => {
    const tournamentRef = await firestoreDatabase.collection(tournamentCollection).doc(tournamentId).get();
    return firestoreDatabase.runTransaction(async (_transaction) => {
        try {
            if(tournamentRef.exists) {
                const tournament = <Tournament> tournamentRef.data();
                // No Player Should Be Added if no data is provided.
                if(tournament.isLocked) {
                    return  null;
                }
                if(tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
                    const swissTournament = <SwissTournament> tournamentRef.data();
                    if (!swissTournament.players) {
                        swissTournament.players = new Array();
                    }
                    let counter = swissTournament.players.length + 1; // Rank Counter
    
                    for(const player of players) {
                        if(swissTournament.players.filter(result => result.uid === player.uid).length === 0) {
                            if(player.uid && player.email) {
                                player.rankNumber = counter;
                                player.tournamentId = swissTournament.id;
                                swissTournament.players.push(player);
                                counter++;
                            } else {
                                return null;
                            }
                        } else {
                            // Non unique player data
                            return null;
                        }
                    }
                    // Add Matchable Accounts For New Players
                    await createMatchAbleAccountsForPlayers(players, swissTournament.matchDuration);
                    _transaction.update(tournamentRef.ref, swissTournament);
                    return swissTournament;
                }
            }
        } catch(error) {
            console.error(error);
        }
        return null;
    });
}
// Invoked During Tournament Creation
export const createMatchableAccountsFromTournament = async (tournament: Tournament) => {
    let map = {}
    if(tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
        const swissTournament = <SwissTournament>  tournament;
        const accountsMap = await createMatchAbleAccountsForPlayers(swissTournament.players, swissTournament.matchDuration);
        if(accountsMap) {
            map = accountsMap;
        }
    }
    return map;
}

// Gets tournament Id
export const getTournamentByID = async (id: string) => {
    const snapshot = await firestoreDatabase.collection(tournamentCollection).doc(id).get();
    const tournament = (snapshot.exists) ? <Tournament> snapshot.data() : null;
    if(tournament){
        switch (tournament.paringAlgorithm) {
            case ParingAlgorithm.SWISS:
                return <SwissTournament> snapshot.data();
        }
    }

    return null;
}

// Updates Whole Tournament Id
export const updateTournament = async (tournament: Tournament) => {
    if(tournament.id) {
        await firestoreDatabase.collection(tournamentCollection).doc(tournament.id).set(tournament);
        return tournament;
    }
    return null;
}

function createMatchedSwissAccountFromPair(pair: Pair, tournament: SwissTournament, matchId: string): Array<MatchedPlayOnlineAccount>{
    const accounts = new Array<MatchedPlayOnlineTournamentAccount>();
    if(pair.whitePlayer && pair.blackPlayer) {
        const white = createMatchedPlayTournamentAccount(tournament.players[pair.whitePlayer - 1],
            tournament.players[pair.blackPlayer - 1], matchId, tournament.matchDuration, Alliance.WHITE, tournament);
        const black = createMatchedPlayTournamentAccount(tournament.players[pair.blackPlayer - 1],
            tournament.players[pair.whitePlayer - 1], matchId, tournament.matchDuration, Alliance.BLACK, tournament);
        if(white && black) {
            accounts.push(white, black);
        }
    }
    return accounts;
}

export const matchOnSwissParings = (paringOutput: ParingOutput, tournament: SwissTournament) => {
    let isMatchMade = false;
    const map = {
        matchables: {},
        matches: {}
    }
    console.log(`${tournament.id}  has ${paringOutput.pairs} for round ${tournament.numbeOfRoundsScheduled}`);
    for(const pair of paringOutput.pairs) {
        /// We have an odd number of players
        if(pair.blackPlayer === 0 && pair.whitePlayer) {
            const round = new Round();
            round.playerNumber = '0000'
            round.scheduledColor = Alliance.NOALLIANCE
            round.result = 'Z' //Known Absence From Round
            tournament.players[pair.whitePlayer].rounds.push(round);
        } else if (pair.blackPlayer && pair.whitePlayer) {
            try {
                const blackPlayerIndex = pair.blackPlayer - 1;
                const whitePlayerIndex = pair.whitePlayer - 1;
                const match = createMatch(tournament.players[blackPlayerIndex].uid, tournament.players[whitePlayerIndex].uid, MatchType.PLAY_ONLINE);
                const matchId = tournament.players[whitePlayerIndex].uid.concat(tournament.players[blackPlayerIndex].uid);
                map.matches[matchId] = match;
                const accounts = createMatchedSwissAccountFromPair (pair, tournament, matchId);
                if(accounts.length  !== 2) {
                    throw new Error("Accounts Must Be Two");
                }
                for(const account of accounts) {
                     map.matchables[account.owner] = account;
                }
                isMatchMade = true;
                tournament.numbeOfRoundsScheduled = (tournament.numbeOfRoundsScheduled) ? tournament.numbeOfRoundsScheduled++ : 1;

            }catch (error) {
                console.error(error);
            }

        }
    }
    if(isMatchMade) {
        console.log(map);
        return map;
    } else {
        throw new Error("Map Has Not Been Found");
    }
}

export const updateObject = async (object: any) => {
    await realtimeDB.ref().update(object);
    return object;
}