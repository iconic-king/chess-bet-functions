/**
 * @autjor Collins Magondu 04/20/2020
 */
import * as admin from 'firebase-admin';
import { SwissTournament } from '../domain/Tournament';

const firestoreDatabase = admin.firestore();
const tournamentCollection = "tournaments";

export const  createSwissTournament = (tournament :SwissTournament) => {
    tournament.id = firestoreDatabase.collection(tournamentCollection).id
    return firestoreDatabase.collection(tournamentCollection).doc(tournament.id).set(tournament);
}