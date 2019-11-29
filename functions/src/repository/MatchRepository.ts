import * as admin from 'firebase-admin';
import { AccountService, MatchableAccount, MatchablePlayOnlineAccount, MatchService} from '../service/AccountService';
import { MatchType } from '../domain/MatchType';

const realtimeDatabase = admin.database();

const matchableReference = realtimeDatabase.ref('matchables');
const matchesReference = realtimeDatabase.ref('matches');
// const accountCollection = firestoreDatabase.collection("accounts");


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

 const updateMatchedAccount = (uid:string,opponent:string,matchId:string) => {
   return matchableReference.child(uid).update({
     matched : true,
     matchable : false,
     opponent : opponent,
     matchId: matchId
   })
}

export const setUpMatch = (black:string, white:string , match_type:MatchType,callback :Function) => {
    const match:MatchService = {
        match_type : match_type,
        players : {
          BLACK : {
             owner :black,
             from : 0,
             to: 0,
             pgn: '',
             events : []
          },
          WHITE :{
            owner :white ,
            from : 0, 
            to: 0,
            pgn: '',
            events : []
          }
        },
      }
    const matchId = matchesReference.push(match).key
    if(matchId !==null){
           return updateMatchedAccount(white,"BLACK",matchId).then(()=>{
               updateMatchedAccount(black,"WHITE",matchId).then(()=>{
                console.log("Match Done ;-)");
                callback();
               })
               .catch((error)=>{
                console.log(error.message);
               })
           })
           .catch((error)=>{
            console.log(error);
            
           });
    }
    return null;
}

export const getMatch = (match_id:string) => {
   return matchesReference.child(match_id).once('value');
}