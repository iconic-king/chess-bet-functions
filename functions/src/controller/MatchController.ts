import { Response, Request } from 'firebase-functions';
import { AccountService, MatchRange , MatchableAccount, MatchablePlayOnlineAccount, MatchedPlayOnlineAccount, MatchService, MatchDetailsService} from '../service/AccountService';

import { setMatchableAccount, 
    getMatchableAccountOnRangedEloRating, 
    getMatchableAccountOnExactEloRating, 
    setUpMatch,
    getMatchableAccount,
    getMatch} from '../repository/MatchRepository';
import { getUserAccount, updateAccount} from "../repository/UserRepository";
import { timeDifferenceCalculator } from '../utils/TimeUtil'   
import { MatchResult } from '../service/MatchService';

export const createMatchabableAccountImplementation = (res : Response, req: Request) => {
    getUserAccount(req.query.uid).get()
    .then(snapshot => {
        if(snapshot.size !== 0){
            try{
                const account = <AccountService> snapshot.docs[0].data();
                setMatchableAccount(account, req.query.match_type)
                .then(() => {
                    res.status(200).send("Done :-)") // Ready to match
                }).catch((error) =>{
                    console.log(error.message);
                    
                })
            }catch(exception){
                console.log(exception.message);
                res.status(403).send("Forbidden");
            }
        }
        else{
            res.status(404).send("User unique id does not exists");
        }
    })
    .catch(error => {
        console.log(error.message);
        res.status(403).send("Forbidden");
    });
}

export const createMatchOnEloRatingImplementation = (res : Response, req: Request) => { 
    const timeOfMatch : Date = new Date();
        getUserAccount(req.query.uid).get()
        .then((snapshot) => {
            if(snapshot.size !== 0){
                try{
                    const matcher = <AccountService>snapshot.docs[0].data();
                    let getMatchableAccountPromise;
                    let matched:boolean = false;
                    if(req.query.start_at !== undefined && req.query.end_at !== undefined ){                                          
                        const range : MatchRange = {
                            start_at: parseInt(req.query.start_at),
                            end_at : parseInt(req.query.end_at)
                        }
                        // Ranged elo rating
                        getMatchableAccountPromise  = getMatchableAccountOnRangedEloRating(matcher,range);
                    }
                    else {
                        // Exact elo rating
                        getMatchableAccountPromise =  getMatchableAccountOnExactEloRating(matcher);
                    }
                    getMatchableAccountPromise
                    // tslint:disable-next-line: no-shadowed-variable
                    .then((snapshot)=>{
                        if(snapshot !== null) {      
                         snapshot.forEach(element => {
                            // tslint:disable-next-line: no-shadowed-variable
                            let account = <MatchableAccount> element.val();
                                if(account.match_type === req.query.match_type && !matched){
                                    const timeDiference = timeDifferenceCalculator(timeOfMatch, account.date_created);
                                    if(timeDiference >= 0 && timeDiference <= 40) {
                                    if((account.match_type.toString() === "PLAY_ONLINE") && 
                                        (account.matchable === true) && (account.matched === false) && (account.owner !== matcher.owner)) {
                                        account = <MatchablePlayOnlineAccount> element.val();
                                        matched = true;
                                        setUpMatch(account.owner, matcher.owner, account.match_type, (uid:string) =>{
                                                // tslint:disable-next-line: no-shadowed-variable
                                                getMatchableAccount(uid).then((snapshot) =>{
                                                    res.json(<MatchedPlayOnlineAccount> snapshot.val());
                                                }).catch((err)=>{
                                                    console.error(err);                                    
                                                })
                                        });
                                    }
                               }
                            }
                         });
                         if(!matched){
                            res.status(404).send("No Matchable Account");
                         }
                    }
                   })
                   .catch((error)=>{
                    console.log(error.message);
                   })
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
    return rating + (32 * (score - expected_score));
}

function updateAccountEloRating( account:AccountService,opponent_rating:number, matchResult:MatchResult) : AccountService {
    if(account.owner === matchResult.gain) {
        account.elo_rating = newRating(expectedScore(opponent_rating,account.elo_rating), 1.0, account.elo_rating);
    }
    else if (matchResult.matchStatus === 'DRAW') {
        account.elo_rating = newRating(expectedScore(opponent_rating,account.elo_rating), 0.5 , account.elo_rating);
    }
    else{
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