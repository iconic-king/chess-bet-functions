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
const express = require('express');
const cors = require('cors');
const app = express();
admin.initializeApp({
    credential : admin.credential.cert(serviceAccount),
    databaseURL : "https://chessbet-app-com-v1.firebaseio.com"
});

/**
 *  Server Initialization Functions
 */

 app.use(cors({origin: true})) // Automatically allow cross-origin requests

import { createMatchabableAccountImplementation, evaluateAndStoreMatch, forceEvaluateMatch} from './controller/MatchController'
import { createUserAccountImplementation, onUserAccountDeleted } from './controller/AccountController'
import { addSpecs} from './controller/MatchQueue';
import { Challenge } from './domain/Challenge';
import { setUpMatch } from './repository/MatchRepository';
import { MatchResult } from './service/MatchService';
import { MatchEvaluationResponse } from './domain/MatchEvaluationResponse';
import { verifyToken } from './utils/AuthUtil';
// ----------------------------- ACCOUNT SERVICE START ----------------------------------------------


export const onUserCreated = functions.auth.user().onCreate((user) => {
    createUserAccountImplementation(user);
});

/** User Account Deletion */
export const onUserDeleted = functions.auth.user().onDelete((user) => {
    onUserAccountDeleted(user);
});

/**
 *  Attempts to listener to any update on a challenge in order to set a match
 * */ 

export const onChallengeAccepted = functions.firestore.document('challenges/{challengeId}').onUpdate((snap, context) => {
    const challenge = <Challenge> snap.after.data();
    if(challenge.accepted){
        // Handle set up of match
        setUpMatch(challenge.owner, challenge.requester, challenge.matchType, () => {
            console.log("Match created : ", challenge);
        });
        return true;
    }
    return false;
});

/**
 * Allows matches that did not end correctly to be forcefully evaluated
 */
app.post('/forceEvaluateMatch', (req,res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type");
    if(req.method === 'POST') {
        verifyToken(req, res, ()=> {
            forceEvaluateMatch(req, res);
        });
    } else{
        res.status(403).send("Forbidden");
    }
 });

/**
 * This function is used to create a matchable account
 */

 app.post('/createUserMatchableAccount',(req,res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type");
    
    if(req.method === 'POST'){
      verifyToken(req, res, ()=> {
        createMatchabableAccountImplementation(res, req);
      });
    }
    else{
        res.status(403).send("Forbidden");
    }
});

// ----------------------------- ACCOUNT SERVICE END ----------------------------------------------


// ----------------------------- MATCH SERVICE START ----------------------------------------------
    // createMatchEvaluationQueue();
    // createMatchDeletionQueue();
/**
 * Should only be used when adding a new spec before go live of a queue 
 */
app.post('/addSpecs', (req,res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type"); 
    if(req.method === 'POST'){
        addSpecs();
    }
});

app.post('/evaluateMatch',(req, res) =>{
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type");
    if(req.method === 'POST'){
        const matchResult = <MatchResult> req.body;      
        verifyToken(req, res, ()=> {
            evaluateAndStoreMatch(matchResult, (evaluationResponse: MatchEvaluationResponse)=> {
                // Send Response For Analysis
                res.send(evaluationResponse);
            });
        });
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


// Expose Express API as a single function
exports.function = functions.https.onRequest(app);