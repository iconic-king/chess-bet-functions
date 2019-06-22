import * as admin from 'firebase-admin';
import { AccountService, MatchableAccount, MatchablePlayOnlineAcount } from '../service/AccountService';
import { MatchType } from '../domain/MatchType';

const firestoreDatabase = admin.firestore();
const realtimeDatabase = admin.database();

const matchableReference = realtimeDatabase.ref('matchables');

export const getUserAccount = (uid:string)=>{
    return firestoreDatabase.collection('accounts').where('owner',"==",uid).get();
}

export const setMatchableAccount =  (account:AccountService,matchType:MatchType) =>{
    let matchable:MatchableAccount;
    if(matchType === MatchType.PLAY_ONLINE){ // Describes Play Online Account
        matchable = new MatchablePlayOnlineAcount(account.owner,
            true,
            false,
            account.elo_rating,
            matchType,
            true)
            return matchableReference.child(account.owner).set(matchable);
        }
    else {
        matchable = new MatchableAccount(account.owner,
            true,
            false,
            account.elo_rating,
            matchType,
            true)
    }
    return matchableReference.child(account.owner).set(matchable);
}


export const getMatchableAccountOnEloRating = (matcher : AccountService) => {
    return matchableReference.orderByChild("elo_rating").equalTo(matcher.elo_rating)
   .once('value');
}