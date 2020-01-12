import * as admin from 'firebase-admin';
import { MatchableAccount, MatchablePlayOnlineAccount, MatchService} from '../service/AccountService';
import { MatchType } from '../domain/MatchType';

const realtimeDatabase = admin.database();

const matchableReference = realtimeDatabase.ref('matchables');
export const matchesReference = realtimeDatabase.ref('matches');
// const accountCollection = firestoreDatabase.collection("accounts");

export const setMatchableAccount =  (matchableAccount: MatchableAccount) =>{
    let matchable:MatchableAccount;
    if(matchableAccount.match_type === MatchType.PLAY_ONLINE){ // Describes Play Online Account
        matchable = new MatchablePlayOnlineAccount(matchableAccount.owner,
            true,
            false,
            matchableAccount.elo_rating,
            matchableAccount.match_type,
            true, matchableAccount.duration)
            return matchableReference.child(matchableAccount.owner).set(matchable);
        }
    else {
        matchable = new MatchableAccount(matchableAccount.owner,
            true,
            false,
            matchableAccount.elo_rating,
            matchableAccount.match_type,
            true, matchableAccount.duration)
    }
    return matchableReference.child(matchableAccount.owner).set(matchable);
}

export const getMatchableAccount = (uid: string) => {
  return matchableReference.child(uid).once('value');
}

 const updateMatchedAccount = (uid:string,opponent:string,matchId:string,oppenentId:string) => {
   return matchableReference.child(uid).update({
     matched : true,
     matchable : false,
     opponent : opponent,
     matchId: matchId,
     opponentId: oppenentId
   })
}

export const removeMatch = (matchId: string, callback: Function) => {
  matchesReference.child(matchId).remove().then(()=>{
    callback()
  }).catch((err)=>{
    console.error(err);
  })
}

export const removeMatchable = (matchableId: string, callback: Function) => {
  matchableReference.child((matchableId)).remove().then(()=> {
    callback();
  }).catch((err)=>{
    callback();
    console.error(err);
  });
}

// TODO Add duration and date of match creaton
export const setUpMatch = (black:string, white:string , match_type:MatchType,callback :Function) => {
    const match:MatchService = {
        match_type : match_type,
        players : {
          BLACK : {
             owner :black,
             from : 0,
             to: 0,
             pgn: '',
             gameTimeLeft: 0,
             events : []
          },
          WHITE :{
            owner :white ,
            from : 0, 
            to: 0,
            pgn: '',
            gameTimeLeft: 0,
            events : []
          }
        },
        scheduleEvaluation: false
      }
    const matchId = matchesReference.push(match).key
    if(matchId !==null){
           return updateMatchedAccount(white,"BLACK",matchId,black).then(()=>{
               updateMatchedAccount(black,"WHITE",matchId,white).then(()=>{
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