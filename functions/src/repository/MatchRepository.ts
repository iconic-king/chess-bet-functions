import * as admin from 'firebase-admin';
import { AccountService, MatchableAccount, MatchablePlayOnlineAccount, MatchService, MatchRange} from '../service/AccountService';
import { MatchType } from '../domain/MatchType';

const firestoreDatabase = admin.firestore();
const realtimeDatabase = admin.database();

const matchableReference = realtimeDatabase.ref('matchables');
const matchesReference = realtimeDatabase.ref('matches');

export const getUserAccount = (uid:string)=>{
    return firestoreDatabase.collection('accounts').where('owner',"==",uid).get();
}

export const setMatchableAccount =  (account:AccountService,matchType:MatchType) =>{
    let matchable:MatchableAccount;
    if(matchType === MatchType.PLAY_ONLINE){ // Describes Play Online Account
        matchable = new MatchablePlayOnlineAccount(account.owner,
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

export const getMatchableAccount = (uid: string) => {
  return matchableReference.child(uid).once('value');
}


export const getMatchableAccountOnExactEloRating = (matcher : AccountService) => {
    return matchableReference.orderByChild("elo_rating")
    .limitToFirst(30)
    .equalTo(matcher.elo_rating)
    .once('value');
}

export const getMatchableAccountOnRangedEloRating = (matcher : AccountService, range: MatchRange) => {
  const startAt : number = matcher.elo_rating - range.start_at;
  const endAt : number = matcher.elo_rating + range.end_at;
  return matchableReference.orderByChild("elo_rating")
  .limitToFirst(30)
  .startAt(startAt)
  .endAt(endAt)
  .once('value');
}

 const updateMatchedAccount = (uid:string,opponent:string,matchId:string) => {
   return matchableReference.child(uid).update({
     matched : true,
     matchable : false,
     opponent : opponent,
     matchId: matchId
   })
}

export const setUpMatch = (black:string, white:string , match_type:MatchType,callback :Function) => {
    const match:MatchService= {
        match_type : match_type,
        status: "IN_PROGRESS",
        players : {
          BLACK : {
             owner :black,
             from : 0,
             to: 0
          },
          WHITE :{
            owner :white ,
            from : 0, 
            to: 0
          }
        },
        events : ["STARTED"]
    }
    const matchId = matchesReference.push(match).key
    if(matchId !==null){
           return updateMatchedAccount(white,"BLACK",matchId).then(()=>{
               updateMatchedAccount(black,"WHITE",matchId).then(()=>{
                console.log("Match Done ;-)");
                callback(white);
               })
               .catch((error)=>{
                console.log(error.message);
               })
           })
           .catch((error)=>{
            console.log(error);
            
           })
    }
    return null;
}