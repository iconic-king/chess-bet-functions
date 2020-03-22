import * as admin from 'firebase-admin';
import { ClubAccount } from '../domain/ClubAccount';

const firestoreDatabase = admin.firestore();

export const createClubAccount = (clubAccount: ClubAccount) => {
    clubAccount.id = firestoreDatabase.collection('club_accounts').doc().id;
    return firestoreDatabase.collection('club_accounts').doc(clubAccount.id).set(clubAccount);
}