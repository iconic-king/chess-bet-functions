/**
 * @autjor Collins Magondu 26/03/2020
 */
import * as admin from 'firebase-admin';
import { ChallengeDTO, Challenge, ChallengeResponse, TargetedChallenge, CreateTargetChallengeFactory, Type } from '../domain/Challenge';
import { MatchType } from '../domain/MatchType';
import { MatchableAccount, UserService } from '../service/AccountService';
import { setMatchableAccount, createDirectMatchFromTargetedChallenge } from './MatchRepository';
import { getUserByUID } from './UserRepository';
import { FCMMessageService, FCMMessageType } from '../service/FCMMessageService';
import { sendMessage } from '../controller/FCMController';

const firestoreDatabase = admin.firestore();
const targetedChallengesCollection = 'targeted_challenges';

function createChallenge(challengeDTO: ChallengeDTO) :Challenge{
 return {
     accepted: false,
     owner: challengeDTO.owner,
     type: challengeDTO.type,
     requester: '',
     duration: challengeDTO.duration,
     minEloRating: challengeDTO.minEloRating,
     maxEloRating: challengeDTO.maxEloRating,
     eloRating: challengeDTO.eloRating,
     matchType: MatchType.PLAY_ONLINE,
     timeStamp: Date.now()
 }
}

async function createMatchableAccount(challengeDTO: ChallengeDTO) {
    const matchableAccount: MatchableAccount = {
        duration: challengeDTO.duration,
        date_created: Date.now().toString(),
        owner: challengeDTO.owner,
        matchable: false,
        matched: false,
        elo_rating: challengeDTO.eloRating,
        match_type: MatchType.PLAY_ONLINE,
        online: false
    }
    return setMatchableAccount(matchableAccount);
}


const setChallenge = async (challengeDTO: ChallengeDTO) => {
    const challenge = createChallenge(challengeDTO);
    await firestoreDatabase.collection('challenges').doc(challengeDTO.owner).set(challenge);
};


function isWithinRange (foundChallege: Challenge, challengeDTO :ChallengeDTO) {
    const timeSpan = Date.now() - 40000;
    return ((foundChallege.eloRating  >= challengeDTO.minEloRating && foundChallege.eloRating <= challengeDTO.maxEloRating) &&
     (challengeDTO.eloRating >= foundChallege.minEloRating && challengeDTO.eloRating <= foundChallege.maxEloRating) && 
    foundChallege.timeStamp > timeSpan)
}

// TODO Break Fuunction into smaller readable Chanks
export const getOrSetChallenge = async (challengeDTO: ChallengeDTO, response: Function) => {
    // Create A Matchable Account Before Finding a challenge
    await createMatchableAccount(challengeDTO);

    let referenceCounter = 0;
    const challengeRefs = new Array<FirebaseFirestore.DocumentReference>();
    const snapshot = await firestoreDatabase.collection('challenges')
    .where('type', '==' , challengeDTO.type)
    .where('duration','==', challengeDTO.duration)
    .where('accepted', '==', false)
    .limit(30).get();

    // Initialize challenge refs array
    snapshot.forEach(result => {
        const challenge = <Challenge> result.data();
        if(isWithinRange(challenge, challengeDTO) && challenge.owner !== challengeDTO.owner){
            challengeRefs.push(result.ref);
        }
    });

    if(challengeRefs.length === 0) {
       setChallenge(challengeDTO).then(()=> {
           response(ChallengeResponse.CREATE)
       }).catch(msg=> {
        console.error(`Error creating challenge for ${challengeDTO.owner} : `,msg); //  Log Error On Functions
        response(ChallengeResponse.ERROR);
    });
    } else {
        // Get Challenge At This Point     
        firestoreDatabase.runTransaction(async transaction => {
            const ref = (challengeRefs.length !== 0) ? (challengeRefs.length  > referenceCounter 
                ? challengeRefs[referenceCounter] : undefined) : undefined
            if(ref){
                const docSnapshot = await transaction.get(ref);
                const challenge = <Challenge> <unknown> docSnapshot;
                if(challenge && !challenge.accepted) {
                    transaction.update(ref, 'accepted', true);
                    transaction.update(ref, 'requester', challengeDTO.owner);
                    referenceCounter ++;
                    return ChallengeResponse.UPDATE;
                } else {
                    return null;
                }
            } else {
                // Set challenge if we have run out of challenges to probe
                const challengeRef = firestoreDatabase.collection('challenges').doc(challengeDTO.owner);
                transaction.set(challengeRef, createChallenge(challengeDTO));
                return ChallengeResponse.CREATE;
            }
            
        }).then(data => {
            response(data);
        }).catch((msg) => {
            console.error(`Error accepting challenge for ${challengeDTO.owner} : `,msg); //  Log Error On Functions
            response(ChallengeResponse.ERROR);
        });
    }
};


export const createTargetedChallenge = async (targetedChallenge: TargetedChallenge) => {
    targetedChallenge.id = firestoreDatabase.collection(targetedChallengesCollection).doc().id;
    targetedChallenge.dateCreated  = new Date().toLocaleDateString();
    targetedChallenge.timeStamp = new Date().getTime();
    targetedChallenge.accepted =  false;
    targetedChallenge.users = new Array();
    targetedChallenge.users.push(targetedChallenge.owner, targetedChallenge.target);
    await firestoreDatabase.collection(targetedChallengesCollection).doc(targetedChallenge.id).set(targetedChallenge);
    // Notification To Target
    const usersSnapshot = await getUserByUID(targetedChallenge.target);
    if(!usersSnapshot.empty) {
        const user = <UserService> usersSnapshot.docs[0].data();
        if(user.fcmToken) {
            // Create FCM_MESSAGE
            const fcmMessage: FCMMessageService = {
                message : `Do you think you can beat me in Chess !!`,
                from: targetedChallenge.ownerName,
                data: '',
                messageType: FCMMessageType.TARGET_CHALLENGE,
                fromUID: targetedChallenge.owner,
                registrationTokens: [user.fcmToken]
            }
            const response = await sendMessage(fcmMessage);
            if(response.successCount > 0) {
                console.log("Notification Sent");
            }
        }
        return targetedChallenge;
    } else {
        throw new Error('No user found for target');
    }
}

export const acceptTargetedChallenge = async (targetedChallenge: TargetedChallenge) => {
    if(targetedChallenge.owner && targetedChallenge.target) {
        const usersSnapshot = await getUserByUID(targetedChallenge.owner);
        if(!usersSnapshot.empty) {
            const user = <UserService> usersSnapshot.docs[0].data();
            const targetedChallengeRef = firestoreDatabase.collection(targetedChallengesCollection).doc(targetedChallenge.id);
            // Create a direct match
            await createDirectMatchFromTargetedChallenge(targetedChallenge);
            const result = await firestoreDatabase.runTransaction(async (transaction) => {
                targetedChallenge.accepted = true;
                transaction.update(targetedChallengeRef, targetedChallenge);
                return true;
            });
            if(!result) {
                throw new Error('Transaction Incomplete');
            }

            if(user.fcmToken){
                // Create FCM_MESSAGE
                const fcmMessage: FCMMessageService = {
                    message : `I accept your challenge !!`,
                    from: targetedChallenge.targetName,
                    data: '',
                    messageType: FCMMessageType.TARGET_CHALLENGE,
                    fromUID: targetedChallenge.target,
                    registrationTokens: [user.fcmToken]
                }
                const response = await sendMessage(fcmMessage);
                if(response.successCount > 0) {
                    console.log("Notification Sent");
                }                
            }
            return targetedChallenge;
        } else {
            throw new Error('No user found for owner');
        }        
    } else {
        throw new Error('Invalid Data');
    }
} 