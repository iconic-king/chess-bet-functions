/**
 * @author Collins Magondu
 */
import { Response, Request } from 'firebase-functions';
import { AccountService, MatchRange ,MatchService, MatchDetailsService, MatchableAccount} from '../service/AccountService';

import { setMatchableAccount,getMatch} from '../repository/MatchRepository';
import { getUserAccount, updateAccount} from "../repository/UserRepository";
import { MatchResult } from '../service/MatchService';
import { MatchTask, addTaskToQueue } from './MatchQueue';

export const createMatchabableAccountImplementation = (res : Response, req: Request) => {
    const matchableAccount = <MatchableAccount> req.body; // JSON  MATCHABLE OBJECT
    setMatchableAccount(matchableAccount)
    .then(() => {
        // Return the account
        res.status(200).send(matchableAccount) // Ready to match
    }).catch((error) =>{
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


export function setMatchOnChallangeAccepted(req: Request, res: Response) {
 // Supply challange id
}

function expectedScore (rating: number, opponent_rating:number) : number {
    return 1 / (1 + (Math.pow(10, (opponent_rating - rating)/ 400)));
}

function newRating (expected_score: number, score: number, rating: number){
    return rating + (32 * (score - expected_score));
}

function updateAccountEloRating( account:AccountService,opponent_rating:number, matchResult:MatchResult) : AccountService {
    if(account.owner === matchResult.gain) {
        // Won
        account.elo_rating = newRating(expectedScore(opponent_rating,account.elo_rating), 1.0, account.elo_rating);
    }
    else if (matchResult.matchStatus === 'DRAW') {
        // Draw
        account.elo_rating = newRating(expectedScore(opponent_rating,account.elo_rating), 0.5 , account.elo_rating);
    }
    else{
        // Lost
        account.elo_rating = newRating(expectedScore(opponent_rating,account.elo_rating), 0 , account.elo_rating);
    }
    account.elo_rating = Math.round(account.elo_rating);
    return account
}

function decidePlayerRating (account_one:AccountService , account_two:AccountService, uid:string) : number {
  return account_one.owner === uid ? account_one.elo_rating : account_two.elo_rating;
}


export const evaluateAndStoreMatch =  (req: Request, res: Response) => {
    const matchResult = <MatchResult> req.body;     
    let account_one:AccountService;
    let account_two:AccountService;
    // tslint:disable-next-line: no-floating-promises
    getUserAccount(matchResult.gain).get().then((snapshot) => {
            account_one = <AccountService> snapshot.docs[0].data();

        // tslint:disable-next-line: no-floating-promises
        getUserAccount(matchResult.loss).get().then((snapshot2) => {
            account_two = <AccountService> snapshot2.docs[0].data();
            account_one = updateAccountEloRating(account_one, account_two.elo_rating, matchResult);
            account_two = updateAccountEloRating(account_two, account_one.elo_rating, matchResult);

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
                    ]
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
                        res.send(match_details);
                    }).catch((err)=>{
                        console.log(err.message);
                        
                    })
                }).catch((err)=>{
                    console.log(err.message);
                })
            }
        }).catch((err) =>{
            console.log(err.message);
        })
        });
    });
}