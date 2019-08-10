import { Response, Request } from 'firebase-functions';
import { AccountService, MatchRange , MatchableAccount, MatchablePlayOnlineAccount, MatchedPlayOnlineAccount} from '../service/AccountService';
import { getUserAccount , 
    setMatchableAccount, 
    getMatchableAccountOnRangedEloRating, 
    getMatchableAccountOnExactEloRating, 
    setUpMatch,
    getMatchableAccount} from '../repository/MatchRepository';
import { timeDifferenceCalculator } from '../utils/TimeUtil'   


export const createMatchabableAccountImplementation = (res : Response, req: Request) => {
    getUserAccount(req.query.uid)
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
        getUserAccount(req.query.uid)
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
                                    if(timeDifferenceCalculator(timeOfMatch, account.date_created) <= 40) {
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