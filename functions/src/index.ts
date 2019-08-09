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

import {createMatchOnEloRatingImplementation, createMatchabableAccountImplementation} from './controller/MatchController'
import { createUserAccountImplementation } from './controller/AccountController'
 
export const onUserCreated = functions.auth.user().onCreate((user) => {
    createUserAccountImplementation(user);
});
/**
 * This function is used to create a matchable account
 */
export const createUserMatchableAccount =  functions.https.onRequest((req,res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    
    if(req.method === 'POST'){
      createMatchabableAccountImplementation(res, req);
    }
    else{
        res.status(403).send("Forbidden");
    }
});

/**
 *  This function is used to get an matchable that can trigger a match
 *  Based on time of creation of the matchable, match type or elo rating range of the specific user requesting the match
 */
export const getMatchableAccountOnEloRating = functions.https.onRequest((req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');

    if(req.method === 'POST'){
        createMatchOnEloRatingImplementation(res,req);
    }
});