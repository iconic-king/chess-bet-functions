/**
 * @author Collins Magondu
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const serviceAccount = require('../chess-bet-creds.json');

admin.initializeApp({
    credential : admin.credential.cert(serviceAccount),
    databaseURL : "https://chessbet-app-com-v1.firebaseio.com"
});

import * as usercreation from './controller/usercreation';
import * as matchcreation from './controller/matchcreation';
import { AccountService, MatchableAccount, MatchablePlayOnlineAccount, MatchedPlayOnlineAccount} from './service/AccountService';
import { timeDifferenceCalculator } from './utils/TimeUtil'

export const onUserCreated = functions.auth.user().onCreate((user) => {
    usercreation.createUser(user).then(()=>{
        usercreation.createUserAccount(user.uid).then(() => {
           console.log("User Created Succesfully");
        }).catch((error)=>{
         console.log(error.message);
        });
    }).catch((error)=>{
       console.log(error.message);
    });
});

export const createUserMatchableAccount =  functions.https.onRequest((req,res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    
    if(req.method === 'POST'){
        matchcreation.getUserAccount(req.query.uid)
        .then(snapshot => {
            if(snapshot.size !== 0){
                try{
                    const account = <AccountService> snapshot.docs[0].data();
                    matchcreation.setMatchableAccount(account, req.query.match_type)
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
        }) 
    }
    else{
        res.status(403).send("Forbidden");
    }
});


export const getMatchableAccountOnEloRating = functions.https.onRequest((req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');

    if(req.method === 'POST'){
        const timeOfMatch : Date = new Date();
        matchcreation.getUserAccount(req.query.uid)
        .then((snapshot) => {
            if(snapshot.size !== 0){
                try{
                    const matcher = <AccountService>snapshot.docs[0].data();
                    let matched:boolean = false;
                    matchcreation.getMatchableAccountOnEloRating(matcher)
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
                                            matchcreation.setUpMatch(account.owner, matcher.owner, account.match_type, (uid:string) =>{
                                                  // tslint:disable-next-line: no-shadowed-variable
                                                  matchcreation.getMatchableAccount(uid).then((snapshot) =>{
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
});