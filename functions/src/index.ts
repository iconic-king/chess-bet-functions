/**
 * @author Collins Magondu
 */

/**
* Changes made on file (index.ts)
    -> VerifyToken has been reimplemented as a custom express middleware
    -> The extra check for request method has been removed entirely.
    -> Replace .then callback pattern with async await
*/

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const {Storage} = require('@google-cloud/storage');

// const serviceAccount = require('../chess-bet-creds.json');
const path = require("path");
const os = require("os");
const spawn = require("child-process-promise").spawn;
const express = require('express');
const cors = require('cors');
const app = express();

admin.initializeApp(functions.config().firebase);
/**
 *  Server Initialization Functions
 */

 app.use(cors({origin: true})) // Automatically allow cross-origin requests

import { createMatchabableAccountImplementation, evaluateAndStoreMatch, forceEvaluateMatch} from './controller/MatchController'
import { markAssignmentImplementation } from './controller/AssignmentController'
import { createUserAccountImplementation, onUserAccountDeleted, onUserPermmissionsUpdate } from './controller/AccountController'
import { createClubAccountImplementation, getClubAccountInfoImplementation } from './controller/ClubController'
import { onRandomChallengeRecieved, onTargetedChallengeReceived, onTargetedChallengeAccepted } from './controller/ChallengeController'
import { addSpecs} from './controller/MatchQueue';
import { Challenge } from './domain/Challenge';
import { setUpMatch } from './repository/MatchRepository';
import { MatchResult } from './service/MatchService';
import { verifyToken } from './utils/AuthUtil';
import { sendFCMMessage } from './controller/FCMController';
import { validateTournamentImplementation, getTournamentParingsImplementation, createTournamentImplementation, addPlayersToTournamentImplementation, scheduleTournamentMatchesImplementation, evaluateTournamentMatchImplementation, setLockedStateOfTournament, setPlayerActiveState, sendNotificationToTournamentPlayers, addPlayerToTournamentImplementation, getActiveUserTournamentsImplementation } from './controller/TournamentController';
import { createServiceAccountImplementation, getServiceAccountImplementation, initiateDarajaPaymentImplementation, withDrawAmountImplementation, getTransactionsImplementation, getTransactionsByTypeImplementation } from './controller/PaymentsContoller';
import { sendTwilioVerificationCode, verifyTwilioVerificationCode } from './controller/VerificationController';
import { NTPApi, NTPTime } from './api/NTPApi';
// ----------------------------- ACCOUNT SERVICE START ----------------------------------------------

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
    try {
        await createUserAccountImplementation(user);
    } catch(error) {
        console.error(error);
    }
});

/** User Account Deletion */
export const onUserDeleted = functions.auth.user().onDelete((user) => {
    // tslint:disable-next-line: no-floating-promises
    onUserAccountDeleted(user);
});

/**
 *  Attempts to listener to any update on a challenge in order to set a match
 * */ 

export const onChallengeAccepted = functions.firestore.document('challenges/{challengeId}').onWrite(async (snap, context) => {
    const challenge = <Challenge> snap.after.data();
    if(challenge.accepted){
        // Handle set up of match
        const status = await setUpMatch(challenge.owner, challenge.requester, challenge.matchType, () => {
            console.log("Match created : ", challenge);
        });
        return status;
    }
    return false;
});

/**
 * Allows matches that did not end correctly to be forcefully evaluated
 * @deprecated
 */
app.post('/forceEvaluateMatch', verifyToken, async (req,res) => {
    console.log("Request ", req.body);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type");
    // tslint:disable-next-line: deprecation
    await forceEvaluateMatch(req, res);
 });

 app.post('/updateUserPermission', verifyToken, async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type");
    await onUserPermmissionsUpdate(req, res);
 });

 // Allow random challenge creation
 app.post('/challenge/randomChallenge',  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type");
    await onRandomChallengeRecieved(req, res);
 });

 app.get('/timeStamp', async (req, res) => {
     try {
        const time = <NTPTime> await NTPApi.getTime();
        res.status(200).send(time);
     } catch (error) {
         res.status(403).send({err: error});
     }
 })

 app.post('/challenge/sendTargetedChallenge', verifyToken, (req, res) => {
    onTargetedChallengeReceived(req, res);
 });

 app.post("/challenge/acceptTargetChallenge", verifyToken, (req, res) => {
    onTargetedChallengeAccepted(req, res);
})

 app.post('/club/createClubAccount', verifyToken, async (req,res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type");
    await createClubAccountImplementation(req, res);
 });

 app.post("/sendFCMMessage", verifyToken, async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type");
    await sendFCMMessage(req, res);
 });

 app.get("/club/getClubAccountDetails", verifyToken, async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set( "Access-Control-Allow-Headers", "Content-Type");
    await getClubAccountInfoImplementation(req, res);
 });


 app.post("/assignment/mark", verifyToken, async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type");
    await markAssignmentImplementation(req, res);
 });

/**
 * This function is used to create a matchable account
 */

 app.post('/createUserMatchableAccount', verifyToken, async (req,res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type");
    await createMatchabableAccountImplementation(res, req);
});

// ----------------------------- ACCOUNT SERVICE END ----------------------------------------------


// ----------------------------- MATCH SERVICE START ----------------------------------------------
    // createMatchEvaluationQueue();
    // createMatchDeletionQueue();
/**
 * Should only be used when adding a new spec before go live of a queue 
 */
app.post('/addSpecs', async (req,res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type"); 
    if(req.method === 'POST'){
        await addSpecs();
    }
});

app.post('/evaluateMatch', verifyToken, async (req, res) =>{
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set( "Access-Control-Allow-Headers", "Content-Type");
    const matchResult = <MatchResult> req.body;
    const result = await evaluateAndStoreMatch(matchResult);
    if(result) {
        res.status(200).send(result);
    } else {
        res.status(503).send({err : 'Evaluation did not take place'});
    }
});

// ----------------------------- MATCH SERVICE END -----------------------------------------------------


// ----------------------------- TOURNAMENT SERVICE START ------------------------------------------------

app.post('/tournament/validate', verifyToken, (req, res) => {
    // tslint:disable-next-line: no-floating-promises
    validateTournamentImplementation(req, res);

});

app.post('/tournament/pair', verifyToken, (req, res) => {
    // tslint:disable-next-line: no-floating-promises
    getTournamentParingsImplementation(req, res);
});


app.post('/tournament/createTournament', verifyToken, (req, res) =>  {
    // tslint:disable-next-line: no-floating-promises
    createTournamentImplementation(req, res);
});

app.post('/tournament/addPlayers', verifyToken, (req, res) =>  {
    // tslint:disable-next-line: no-floating-promises
    addPlayersToTournamentImplementation(req, res);
});

app.post('/tournament/addPlayer', (req, res) =>  {
    // tslint:disable-next-line: no-floating-promises
    addPlayerToTournamentImplementation(req, res);
});

app.post('/tournament/schedule', (req, res) =>  {
    // tslint:disable-next-line: no-floating-promises
    scheduleTournamentMatchesImplementation(req, res);
});

app.post('/tournament/evaluateTounamentMatch', verifyToken, (req, res) => {
    // tslint:disable-next-line: no-floating-promises
    evaluateTournamentMatchImplementation(req, res);
});

app.post('/tournament/sendNotification', (req, res) => {
    // tslint:disable-next-line: no-floating-promises
    sendNotificationToTournamentPlayers(req, res);
})

app.post('/tournament/isLocked', (req, res) =>  {
    // tslint:disable-next-line: no-floating-promises
    setLockedStateOfTournament(req, res);
});

app.post('/tournament/player/isActive', (req, res) =>  {
    // tslint:disable-next-line: no-floating-promises
    setPlayerActiveState(req, res);
});

app.get('/tournament/activeTournaments', (req, res) => {
    // tslint:disable-next-line: no-floating-promises
    getActiveUserTournamentsImplementation(req, res);
});

// ----------------------------- TOURNAMENT SERVICE END -----------------------------------------------


// ----------------------------- VERIFICATION SERVICE START -------------------------------------------

app.post('/verify/twilio/sendCode', (req, res) =>  {
    // tslint:disable-next-line: no-floating-promises
    sendTwilioVerificationCode(req, res);
});

app.post('/verify/twilio/verifyCode', (req, res) =>  {
    // tslint:disable-next-line: no-floating-promises
    verifyTwilioVerificationCode(req, res);
});

// ----------------------------- VERIFICATION SERVICE END -------------------------------------------


// ----------------------------- PAYEMENTS SERVCIE START ------------------------------------------------

app.post('/payments/createAccount', (req, res) => {
    // tslint:disable-next-line: no-floating-promises
    createServiceAccountImplementation(req, res);
});

app.post('/payments/withdraw', (req, res) => {
    // tslint:disable-next-line: no-floating-promises
    withDrawAmountImplementation(req, res);
});

app.get('/payments/serviceAccount', (req, res) => {
    // tslint:disable-next-line: no-floating-promises
    getServiceAccountImplementation(req, res);
});


app.post('/daraja/save', (req, res) => {
    // tslint:disable-next-line: no-floating-promises
    initiateDarajaPaymentImplementation(req, res);
});

app.get('/transactions/:phoneNumber', (req, res) => {
    // tslint:disable-next-line: no-floating-promises
    getTransactionsImplementation(req, res);
});

app.get('/transactions/:phoneNumber/:type', (req, res) => {
    // tslint:disable-next-line: no-floating-promises
    getTransactionsByTypeImplementation(req, res);
})

// ----------------------------- PAYEMENTS SERVCIE END ------------------------------------------------

// ----------------------------- STORAGE FUNCTIONS START  ----------------------------------------------
export const resizeProfilePhotos = functions.storage.object().onFinalize( async event => {
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

    try {
        await newBucket.file(filePath).download({ destination: tmpFilePath });
        await spawn("convert", [tmpFilePath, "-resize", "200x200", tmpFilePath]);
        try {
            newBucket.upload(tmpFilePath, {
                destination: path.basename(filePath),
                metadata: newMetadata
            });
            console.log("Resize Done");
        } catch(error) {
            console.log(error.message);
        }
    } catch(error) {
        //error
    }
});
// ----------------------------- STORAGE FUNCTIONS START  --------------------------------------------


// Expose Express API as a single function
exports.function = functions.https.onRequest(app);