import * as admin from 'firebase-admin';
import { MatchableAccount, MatchablePlayOnlineAccount, MatchService, MatchedPlayOnlineTournamentAccount, MatchedPlayOnlineAccount} from '../service/AccountService';
import { MatchType } from '../domain/MatchType';
import { PlayerSection, SwissTournament } from '../domain/Tournament';
import { Alliance } from '../domain/Alliance';
import { TargetedChallenge } from '../domain/Challenge';

const realtimeDatabase = admin.database();

const matchableReference = realtimeDatabase.ref('matchables');
export const matchesReference = realtimeDatabase.ref('matches');
// const accountCollection = firestoreDatabase.collection("accounts");

export const setMatchableAccount =  (matchableAccount: MatchableAccount) => {
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

export const removeMatch = (matchId: string) => {
  console.log("Removing match id ", matchId);
  return matchesReference.child(matchId).remove();
}

export const removeMatchable = (matchableId: string) => {
  return matchableReference.child((matchableId)).remove();
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

export const createMatchedPlayTournamentAccount = (player: PlayerSection, opponent: PlayerSection, matchId: string, 
  duration: number, alliance: Alliance, tournament: SwissTournament): MatchedPlayOnlineTournamentAccount | null => {
    if(opponent.name && player.uid && opponent.uid) {
      const account = new MatchedPlayOnlineTournamentAccount(player.uid, false, true, 0, MatchType.PLAY_ONLINE, true, opponent.name, matchId, duration, opponent.uid);
      account.email = player.email;
      account.owner = player.uid;
      account.result = '0'
      account.sidePlayed = alliance;
      account.tournamentId = tournament.id;
      account.timeStamp = new Date().getTime();
      account.oppenentRank = opponent.rankNumber;
      account.currentRound = (tournament.numbeOfRoundsScheduled) ?  tournament.numbeOfRoundsScheduled + 1 : 1;
      return account;
    }
    return null;
}

export const createMatch = (black:string, white:string , match_type:MatchType)=> {
  const match: MatchService = {
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
  return match;
}

/**
 * Creates match directy as a json object withoout depending on a challenge trigger
 */
export const createDirectMatchFromTargetedChallenge = (targetChallenge: TargetedChallenge) => {
  const map = {matchables : {}, matches: {}}
  map.matchables[targetChallenge.owner] = <MatchedPlayOnlineAccount> {
    opponent: 'WHITE',
    opponentId: targetChallenge.target,
    owner: targetChallenge.owner,
    matchable: false,
    matched: true,
    elo_rating: 0,
    match_type: targetChallenge.matchType,
    online: true,
    matchId: targetChallenge.owner.concat(targetChallenge.target),
    duration: 10 // Default Rapid
  }

  map.matchables[targetChallenge.target] = <MatchedPlayOnlineAccount> {
    opponentId: targetChallenge.owner,
    owner: targetChallenge.target,
    opponent: 'BLACK',
    matchable: false,
    matched: true,
    elo_rating: 0,
    match_type: targetChallenge.matchType,
    online: true,
    matchId: targetChallenge.owner.concat(targetChallenge.target),
    duration: 10 // Default Rapid
  }
  map.matches[targetChallenge.owner.concat(targetChallenge.target)] = createMatch(targetChallenge.owner, targetChallenge.target, targetChallenge.matchType);
  return realtimeDatabase.ref().update(map);
}

export const canUserGetMatched = async (uid: string) => {
  const matchedAccountSnapshot = await matchableReference.child(uid).once('value');
  if(matchedAccountSnapshot.exists()){
    const matchedAccount = <MatchedPlayOnlineAccount> matchedAccountSnapshot.val();
    return matchedAccount.matchable; 
  } else {
    return false
  }
} 