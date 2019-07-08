/**
 * @author Collins Magondu
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const serviceAccount = require('../../chess-bet-creds.json');

admin.initializeApp({
    credential : admin.credential.cert(serviceAccount)
});

import * as usercreation from './controller/usercreation';
import * as matchcreation from './controller/matchcreation';
import { AccountService, MatchableAccount, MatchablePlayOnlineAcount } from './service/AccountService';

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
        matchcreation.getUserAccount(req.query.uid)
        .then((snapshot) => {
            if(snapshot.size !== 0){
                try{
                    const matcher = <AccountService>snapshot.docs[0].data();
                    matchcreation.getMatchableAccountOnEloRating(matcher)
                    // tslint:disable-next-line: no-shadowed-variable
                    .then((snapshot)=>{
                        if(snapshot !== null) {
                         let matched:boolean = false;
                         snapshot.forEach(element => {
                            // tslint:disable-next-line: no-shadowed-variable
                            let account = <MatchableAccount> element.val();
                            if(account.match_type === req.query.match_type){
                                 if((account.match_type.toString() === "PLAY_ONLINE") && 
                                     (account.matchable === true) && (account.matched === false) && (account.owner !== matcher.owner)) {
                                         console.log(account);
                                         account = <MatchablePlayOnlineAcount> element.val()
                                         const response = matchcreation.setUpMatch(account.owner, matcher.owner, account.match_type)
                                         if(response!== null){
                                            matched = true;
                                            res.status(200).send(account);
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
})