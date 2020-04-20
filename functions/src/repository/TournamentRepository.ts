/**
 * @autjor Collins Magondu 04/20/2020
 */
import * as admin from 'firebase-admin';
import { SwissTournament, PlayerSection, Tournament } from '../domain/Tournament';
import { ParingAlgorithm } from '../domain/ParingAlgorithm';

const firestoreDatabase = admin.firestore();
const tournamentCollection = "tournaments";

export const  createSwissTournament = (tournament :SwissTournament) => {
    tournament.id = firestoreDatabase.collection(tournamentCollection).id
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
        if(tournamentRef) {
            const tournament = <Tournament> tournamentRef.data();
            if(tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
                const swissTournament = <SwissTournament> tournamentRef.data();
                let counter = swissTournament.players.length + 1; // Rank Counter

                for(const player of players) {
                    if(swissTournament.players.filter(result => result.uid === player.uid).length > 0) {
                        if(player.uid) {
                            player.rankNumber = counter;
                            swissTournament.players.push(player);
                            counter++;
                        } else {
                            return null;
                        }
                    } else {
                        return null;
                    }
                }
                _transaction.update(tournamentRef.ref, swissTournament);
                return swissTournament;
            }
        }
        return null;
    });
}