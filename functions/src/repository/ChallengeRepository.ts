/**
 * @autjor Collins Magondu 26/03/2020
 */
/**
 * Changes made on file (ChallengeCounter.ts)
 * -> replaced .then callbacks with async await
 * -> attempted 1 TODO (break function into smaller readable Chanks marked on getOrSetChallenges function)
 */
import * as admin from 'firebase-admin';
import { ChallengeDTO, Challenge, ChallengeResponse, TargetedChallenge, Type } from '../domain/Challenge';
import { MatchType } from '../domain/MatchType';
import { MatchableAccount, UserService, MatchableBetOnlineAccount } from '../service/AccountService';
import { setMatchableAccount, createDirectMatchFromTargetedChallenge, canUserGetMatched} from './MatchRepository';
import { getUserByUID } from './UserRepository';
import { FCMMessageService, FCMMessageType } from '../service/FCMMessageService';
import { sendMessage } from '../controller/FCMController';
import { ServiceAccount, PaymentAccount } from '../domain/ServiceAccount';
import { getServiceAccountByUserId } from './PaymentsRepository';
import { BetDTO } from '../domain/BetDTO';
import { PaymentsApi } from '../api/PaymentsApi';

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
     matchType: (challengeDTO.type === Type.BET_CHALLENGE || challengeDTO.type === Type.BET_FRIENDLY) ? MatchType.BET_ONLINE : MatchType.PLAY_ONLINE,
     timeStamp: Date.now(),
     amount: (!challengeDTO.amount.amount) ? 0 : challengeDTO.amount.amount,
     currency: (!challengeDTO.amount.currency) ? 'KES' : challengeDTO.amount.currency
 }
}

async function createMatchableAccount(challengeDTO: ChallengeDTO) {
    let matchableAccount: MatchableAccount;
    if(challengeDTO.type === Type.BET_CHALLENGE || challengeDTO.type === Type.BET_FRIENDLY) {
        matchableAccount = <MatchableBetOnlineAccount> {
            amount : challengeDTO.amount,
            duration: challengeDTO.duration,
            date_created: Date.now().toString(),
            owner: challengeDTO.owner,
            matchable: false,
            matched: false,
            elo_rating: challengeDTO.eloRating,
            match_type: MatchType.PLAY_ONLINE,
            online: false
        }
    } else  {
         matchableAccount = <MatchableAccount> {
            duration: challengeDTO.duration,
            date_created: Date.now().toString(),
            owner: challengeDTO.owner,
            matchable: false,
            matched: false,
            elo_rating: challengeDTO.eloRating,
            match_type: MatchType.PLAY_ONLINE,
            online: false
        }
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


function getChallengeFromPotentialSet (challengeRefs: Array<FirebaseFirestore.DocumentReference>, challengeDTO: ChallengeDTO){
    let referenceCounter = 0; 
    return firestoreDatabase.runTransaction( async transaction => {
        const ref = (challengeRefs.length !== 0) ? (challengeRefs.length  > referenceCounter 
            ? challengeRefs[referenceCounter] : undefined) : undefined
        if(ref){
            const docSnapshot = await transaction.get(ref);
            const challenge = <Challenge> <unknown> docSnapshot;
            if(challenge && !challenge.accepted) {
                transaction.update(ref, 'accepted', true);
                transaction.update(ref, 'requester', challengeDTO.owner);
                referenceCounter ++;
                return challenge;
            } else {
                return null;
            }
        } else {
            // Set challenge if we have run out of challenges to probe
            const challengeRef = firestoreDatabase.collection('challenges').doc(challengeDTO.owner);
            transaction.set(challengeRef, createChallenge(challengeDTO));
            return ChallengeResponse.CREATE;
        }
    });
}

function findChallengesQuery (challengeDTO: ChallengeDTO) {
    if(challengeDTO.type === Type.BET_CHALLENGE || challengeDTO.type === Type.BET_FRIENDLY) {
        return firestoreDatabase.collection('challenges')
        .where('type', '==' , challengeDTO.type)
        .where('duration','==', challengeDTO.duration)
        .where('accepted', '==', false)
        .where('amount', '==',  challengeDTO.amount.amount)
        .where('currency', '==', challengeDTO.amount.currency)
        .limit(30).get();
    } else {
        return firestoreDatabase.collection('challenges')
        .where('type', '==' , challengeDTO.type)
        .where('duration','==', challengeDTO.duration)
        .where('accepted', '==', false)
        .limit(30).get();
    }
}

export const placeBet = async (challenge: Challenge)=> {
    const serviceAccountA = <ServiceAccount> await getServiceAccountByUserId(challenge.owner);
    const serviceAccountB = <ServiceAccount> await getServiceAccountByUserId(challenge.requester);
    const betDTO = <BetDTO> {
        amount: {
            amount: challenge.amount,
            currency: challenge.currency
        },
        partyA: serviceAccountA.phoneNumber,
        partyB: serviceAccountB.phoneNumber
    }
    await PaymentsApi.placeBet(betDTO);
}

// TODO Break Fuunction into smaller readable Chanks
export const getOrSetChallenge = async (challengeDTO: ChallengeDTO, response: Function) => {
    if(challengeDTO.type === Type.BET_CHALLENGE) {
        const serviceOwnerAccount = <ServiceAccount> await getServiceAccountByUserId(challengeDTO.owner);
        const paymentAccount = <PaymentAccount> JSON.parse(await PaymentsApi.getAccount(serviceOwnerAccount) as string);
        if (challengeDTO.amount.currency !== 'USD') {
            response(ChallengeResponse.ERROR);
            return;
        }        
        
        if(Number(paymentAccount.balance) < Number(challengeDTO.amount.amount)) {
            response(ChallengeResponse.INSUFFICIENT_FUNDS);
            return;
        }
    }

    // Create A Matchable Account Before Finding a challenge
    await createMatchableAccount(challengeDTO);

    const challengeRefs = new Array<FirebaseFirestore.DocumentReference>();
    const snapshot = await findChallengesQuery(challengeDTO);

    // Initialize challenge refs array
    snapshot.forEach(result => {
        const challenge = <Challenge> result.data();
        if(isWithinRange(challenge, challengeDTO) && challenge.owner !== challengeDTO.owner){
            challengeRefs.push(result.ref);
        }
    });

    if(challengeRefs.length === 0) {
        try {
            await setChallenge(challengeDTO);
            response(ChallengeResponse.CREATE);
        } catch(msg) {
            console.error(`Error creating challenge for ${challengeDTO.owner} : `,msg); //  Log Error On Functions
            response(ChallengeResponse.ERROR);
        }
    } else {
        // Get Challenge At This Point     
        try {
            const data = await getChallengeFromPotentialSet(challengeRefs, challengeDTO);
            if(data && data !== ChallengeResponse.CREATE) {
                if(challengeDTO.type === Type.BET_CHALLENGE) {
                    try {
                        // Place bet will fail with inssuficient funds
                         await placeBet(data);
                         console.log(`Placed Bet For User ${data.owner} and ${data.requester}`);
                        response(ChallengeResponse.UPDATE);
                    } catch (error) {
                        response(ChallengeResponse.ERROR);
                    }
                }
            } else {
                response(data);
            }
        } catch(msg) {
            console.error(`Error accepting challenge for ${challengeDTO.owner} : `,msg); //  Log Error On Functions
            response(ChallengeResponse.ERROR);
        }
    }
};


export const createTargetedChallenge = async (targetedChallenge: TargetedChallenge) => {
    targetedChallenge.id = firestoreDatabase.collection(targetedChallengesCollection).doc().id;
    targetedChallenge.dateCreated  = new Date().toLocaleDateString();
    targetedChallenge.timeStamp = new Date().getTime();
    targetedChallenge.accepted =  false;
    targetedChallenge.users = new Array();
    targetedChallenge.users.push(targetedChallenge.owner, targetedChallenge.target);

    const matchable = await canUserGetMatched(targetedChallenge.target);

    if(!matchable) {
        throw new Error('Target has an ongoing match')
    }

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
            const matchable = await canUserGetMatched(targetedChallenge.owner);

            if(!matchable) {
                throw new Error('Target has an ongoing match')
            }            
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