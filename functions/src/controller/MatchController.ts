/**
 * @author Collins Magondu
 */
import { Response, Request } from 'firebase-functions';
import { AccountService, MatchRange ,MatchService, MatchDetailsService, MatchableAccount} from '../service/AccountService';

import { setMatchableAccount,getMatch, removeMatch, removeMatchable} from '../repository/MatchRepository';
import { getUserAccount, updateAccount} from "../repository/UserRepository";
import { MatchResult } from '../service/MatchService';
import { MatchTask, addTaskToQueue } from './MatchQueue';
import { MatchEvaluationResponse } from '../domain/MatchEvaluationResponse';

export const createMatchabableAccountImplementation = (res : Response, req: Request) => {
    const matchableAccount = <MatchableAccount> req.body; // JSON  MATCHABLE OBJECT
    setMatchableAccount(matchableAccount)
    .then(() => {
        // Return the account
        res.status(200).send(matchableAccount) // Ready to match
    }).catch((error) =>{
        // TODO respond with relevant error
        console.log(error.message);
    });         
} 

export const createMatchOnEloRatingImplementation = (res : Response, req: Request) => {
        getUserAccount(req.query.uid).get()
        .then((snapshot) => {
            if(snapshot.size !== 0){
                try{
                    const matcher = <AccountService>snapshot.docs[0].data();                
                    let range : MatchRange;

                    if(req.query.start_at === undefined || req.query.end_at === undefined){
                        range = {
                            start_at: 100,
                            end_at:100
                        }
                    } else {
                        range = {
                            start_at: parseInt(req.query.start_at),
                            end_at:parseInt(req.query.end_at)
                        }
                    }
                    const task: MatchTask = {
                        match_range: range,
                        matcher : matcher,
                    };
                    addTaskToQueue(task, function (status: number) {
                        if(status === 0){
                            res.status(200).send(matcher);
                        }
                        else {
                            // Send forbidden request
                            res.status(403).send(matcher);
                        }
                    });
                }catch(exception){
                    res.status(403).send("Forbidden");
                }
            }
        })
        .catch((error)=> {
          console.log(error.message);
          res.status(403).send("Forbidden");
        });
}

function expectedScore (rating: number, opponent_rating:number) : number {
    return 1 / (1 + (Math.pow(10, (opponent_rating - rating)/ 400)));
}

function newRating (expected_score: number, score: number, rating: number){
    console.log(expected_score);
    console.log(rating);
    console.log(score);
    
    return rating + (32 * (score - expected_score));
}

function updateAccountEloRating( account:AccountService,opponent_rating:number, matchResult:MatchResult) : number {
    if(account.owner === matchResult.gain) {
        // Won
        account.elo_rating = newRating(expectedScore(account.elo_rating, opponent_rating), 1.0, account.elo_rating);
    }
    else if (matchResult.matchStatus === 'DRAW') {
        // Draw
        account.elo_rating = newRating(expectedScore(account.elo_rating, opponent_rating), 0.5 , account.elo_rating);
    }
    else if(account.owner === matchResult.loss){
        // Lost
        account.elo_rating = newRating(expectedScore(account.elo_rating,opponent_rating), 0 , account.elo_rating);
    }
    account.elo_rating = Math.round(account.elo_rating);
    return account.elo_rating;
}

/** Decides player rating on player uid */
function decidePlayerRating (account_one:AccountService , account_two:AccountService, uid:string) : number {
  return account_one.owner === uid ? account_one.elo_rating : account_two.elo_rating;
}

/* Ensures points taken from one player are given to another no floating points left*/
function tradePoints(pointsBefore: number, pointsAfter:number){
    return pointsAfter - pointsBefore;
}

/**
 * Ensures points are taken from loser to winner and not derived from winning user (Algorithm Supports This)
 * @param account_one 
 * @param account_two 
 * @param matchResult 
 */
function exchangePoints(account_one: AccountService, account_two :AccountService, matchResult: MatchResult){
    const account_one_elo = account_one.elo_rating;
    account_one.elo_rating = updateAccountEloRating(account_one, account_two.elo_rating, matchResult);
    const newPoints = tradePoints(account_one_elo, account_one.elo_rating);
    if(newPoints >= 0) {
       account_two.elo_rating -= newPoints;   
    } else {
       account_two.elo_rating += (newPoints *  -1) // Ensure accounts do not have negative values
    }
}

export const evaluateAndStoreMatch =  (matchResult: MatchResult, callback: Function) => {
    console.log(matchResult.pgnText);
    let account_one:AccountService;
    let account_two:AccountService;
    getUserAccount(matchResult.gain).get().then((snapshot) => {
        account_one = <AccountService> snapshot.docs[0].data();
        getUserAccount(matchResult.loss).get().then((snapshot2) => {
            account_two = <AccountService> snapshot2.docs[0].data();
            exchangePoints(account_one, account_two, matchResult);
            getMatch(matchResult.matchId).then((snapshot3)=>{
                if(snapshot3.exists){
                const match = <MatchService>snapshot3.val();
                const match_details: MatchDetailsService = {
                    match_result : matchResult,
                    match_type : match.match_type,
                    players : [
                        {
                            owner : match.players.BLACK.owner,
                            elo_rating : decidePlayerRating(account_one,account_two,match.players.BLACK.owner),
                            events : match.players.BLACK.events,
                            type : 'BLACK'
                        },
                        {
                            owner : match.players.WHITE.owner,
                            elo_rating : decidePlayerRating(account_one,account_two,match.players.WHITE.owner),
                            events : match.players.WHITE.events,
                            type : 'WHITE'
                        }
                    ],
                    matchPgn: matchResult.pgnText
                }
                if(account_one.matches === undefined){
                    account_one.matches = new Array<MatchDetailsService>();
                }
                if(account_two.matches === undefined) {
                    account_two.matches = new Array<MatchDetailsService>();
                }
                account_one.matches.push(match_details);
                account_two.matches.push(match_details); 
                updateAccount(account_one).then(()=>{
                    updateAccount(account_two).then(()=>{
                        // Confirms match has been scored
                        removeMatchable(account_one.owner, ()=> {
                            removeMatchable(account_two.owner, ()=>{
                                removeMatch(matchResult.matchId, ()=>{
                                    const evaluationResponse = <MatchEvaluationResponse> {
                                        ownerOne : account_one.owner,
                                        ownerTwo: account_two.owner,
                                        ownerOneElo : account_one.elo_rating,
                                        ownerTwoElo : account_two.elo_rating
                                    }
                                    callback(evaluationResponse);
                                })
                            });
                        });
                    }).catch((err)=>{
                        console.error(err.message);
                        
                    })
                }).catch((err)=>{
                    console.error(err.message);
                })
            }
        }).catch((err) =>{
            console.error(err.message);
        })
        }).catch((err) =>{
            console.error(err.message);
        });
    }).catch((err) =>{
        console.error(err.message);
    });
}


export const forceEvaluateMatch = (req,res) => {
    const matchId = req.body;
    getMatch(matchId).then(snapshot => {
        if(snapshot.exists){
        const match = <MatchService> snapshot.val();
        const gain = (match.players.WHITE.gameTimeLeft > match.players.WHITE.gameTimeLeft) 
        ? match.players.WHITE.owner : match.players.BLACK.owner; 
        const loss = (match.players.WHITE.gameTimeLeft > match.players.WHITE.gameTimeLeft) 
        ? match.players.BLACK.owner : match.players.WHITE.owner; 
    
        const matchResult: MatchResult = {
          pgnText : match.players.WHITE.pgn,   
          matchId : snapshot.key || '',
          matchStatus: "ABANDONMENT",
          gain: gain,
          loss: loss,
          _id: snapshot.key || ''
        }
        evaluateAndStoreMatch(matchResult, (evaluationResponse) => {
            console.log("Match Evaluation Done ", evaluationResponse);
        }); 
        res.status(200).send();
        }
    }).catch(error =>{
        console.error(error);
        res.status(403).send();
    });
}