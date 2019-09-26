/**
 * @author Collins Magondu
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const {Storage} = require('@google-cloud/storage');
const serviceAccount = require('../chess-bet-creds.json');
const path = require("path");
const os = require("os");
const spawn = require("child-process-promise").spawn;

admin.initializeApp({
    credential : admin.credential.cert(serviceAccount),
    databaseURL : "https://chessbet-app-com-v1.firebaseio.com"
});

import {createMatchOnEloRatingImplementation, createMatchabableAccountImplementation, evaluateAndStoreMatch} from './controller/MatchController'
import { createUserAccountImplementation } from './controller/AccountController'
// ----------------------------- ACCOUNT SERVICE START ----------------------------------------------


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

// ----------------------------- ACCOUNT SERVICE END ----------------------------------------------


// ----------------------------- MATCH SERVICE START ----------------------------------------------

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

export const evaluateMatch = functions.https.onRequest((req, res) =>{
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');

    if(req.method === 'POST'){
        evaluateAndStoreMatch(req,res);
    }
});

// ----------------------------- MATCH SERVICE END ----------------------------------------------

// ----------------------------- STORAGE FUNCTIONS START  ----------------------------------------------
export const resizeProfilePhotos = functions.storage.object().onFinalize(event => {
    const bucket = event.bucket;
    const contentType = event.bucket;
    const filePath = event.name;
    const metadata = event.metadata;

    console.log(path.basename(filePath));

    if(metadata !== undefined && metadata.isResized){
        console.log("Already resized");
        return;
    }
    
    if(path.basename(filePath).toString() !== "profile_photo"){
        console.log("Function to resize profile photos");
        return;
    }

    console.log("Execution started");
    const newBucket = new Storage().bucket(bucket);

    const tmpFilePath = path.join(os.tmpdir(),path.basename(filePath));
    const newMetadata = { 
        contentType : contentType,
        isResized : true
    };
    return newBucket.file(filePath).download({
       destination : tmpFilePath 
    }).then(()=> {
        return spawn("convert", [tmpFilePath, "-resize", "200x200", tmpFilePath])
    }).then(()=> {
        try {
            newBucket.upload(tmpFilePath, {
                destination : path.basename(filePath),
                metadata : newMetadata
            });
            console.log("Resize Done");
        } catch(error) {
            console.log(error.message);
        }
    });
});
// ----------------------------- STORAGE FUNCTIONS START  --------------------------------------------