import * as admin from 'firebase-admin';
import { ClubAccount, ClubAccoutInfo } from '../domain/ClubAccount';
import { UserService } from '../service/AccountService';
import { PuzzleAccount } from '../domain/Puzzle';

const firestoreDatabase = admin.firestore();

export const createClubAccount = (clubAccount: ClubAccount) => {
    clubAccount.id = firestoreDatabase.collection('club_accounts').doc().id;
    return firestoreDatabase.collection('club_accounts').doc(clubAccount.id).set(clubAccount);
}

export const getClubAccountInfo = async (uid : string, clubId: string) =>{
  const clubAccountInfo = new ClubAccoutInfo();
  const clubAccount = await firestoreDatabase.collection('club_accounts')
  .where('owner', '==', uid)
  .where('clubId', '==', clubId)
  .limit(1).get();
  if (!clubAccount.empty) {
    clubAccountInfo.clubAccount = <ClubAccount> clubAccount.docs[0].data();
  }
  const user = await firestoreDatabase.collection('users').doc(uid).get();
  if(user.exists){
    clubAccountInfo.user = <UserService> user.data();
  }

  const puzzleAccount = await firestoreDatabase.collection('puzzle_accounts').doc(uid).get();
  if(puzzleAccount.exists){
      clubAccountInfo.puzzleAccount = <PuzzleAccount> puzzleAccount.data();
  }

  return Promise.resolve(clubAccountInfo)
}