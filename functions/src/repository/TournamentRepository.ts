/**
 * @autjor Collins Magondu 04/20/2020
 */
import * as admin from 'firebase-admin';
import { SwissTournament, PlayerSection, Tournament } from '../domain/Tournament';
import { ParingAlgorithm } from '../domain/ParingAlgorithm';
import { ParingOutput } from '../domain/ParingOutput';
import { MatchablePlayOnlineTournamentAccount } from '../service/AccountService';
import { MatchType } from '../domain/MatchType';

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

export const matchSwissTournamentPairs = (paringOutPut: ParingOutput): Tournament | null => {
    return null;
}