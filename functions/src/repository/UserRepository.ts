import * as admin from 'firebase-admin';
import { AccountService,AccountEvent, UserService } from '../service/AccountService';
import { MatchType } from '../domain/MatchType';
/**
 * @author Collins Magondu
 */
const firestoreDatabase = admin.firestore();

export const MIN_ELO_RATING:number = 1000;

export const createUserAccount =  (uid:string) => {
  const date = new Date().toLocaleString();

  const initialEvent:AccountEvent = {
    name : "CREATED",
    date_created: date,
    done: true
  }
  
  const account: AccountService = {
    date_created: date,
    last_date_modified: date,
    terms_condition_accepted: false,
    events:[
      initialEvent
    ],
    status : 'PENDING', //AccountStatus.PENDING
    amount : 0,
    currency : "" ,
    elo_rating : MIN_ELO_RATING ,
    owner : uid,
    matches:[],
    last_match_amount : {
      currency: 'KSH',
      amount: 0.00
    },
    last_match_duration: 0, // Minutes
    last_match_type: MatchType.NO_TYPE,
    last_matchable_time: 0,
    matched : false
  }
  return firestoreDatabase.collection("accounts").add(account);
}

// Initialize user and user account in firestore
export const createUser = (user:admin.auth.UserRecord) => {
 const date = new Date().toLocaleString();

 const user_account: UserService = {
  email: user.email,
  uid: user.uid,
  disabled: user.disabled,
  date_created:date ,
  date_modified:date,
  user_name : "anonymous",
  profile_photo_url : ''
 }

 return firestoreDatabase.collection("users").doc(user.uid).set(user_account);
}

export const getUserByEmail = (user: admin.auth.UserRecord) => {
  return firestoreDatabase.collection("users").where('email', "==", user.email).get();
}

export const getUserByUID = (uid: string) => {
  return firestoreDatabase.collection("users").where("uid", "==", uid).get();
}

export const getUserAccount = (uid:string) => {
  return firestoreDatabase.collection('accounts').where('owner',"==",uid);
}

export const updateAccount = (account: AccountService) => {
  const query = getUserAccount(account.owner);
  return firestoreDatabase.runTransaction( (result) => {
    return result.get(query).then( (snapshot) => {
      if(!snapshot.empty){
        const doc = snapshot.docs[0].ref;
        result.update(doc, account);
      }
    });
  });
}

export const deleteUserAccount = (uid: string) =>{
  getUserByUID(uid).then((snapshots) => {
    if(!snapshots.empty){
      const doc = snapshots.docs[0];
      // Delete user account
      doc.ref.delete().then(() => {
        getUserAccount(uid).get().then((snapshot) => {
            if(!snapshot.empty){
              const account = snapshot.docs[0];
              account.ref.delete().then(() => {
                console.log(`Deleted User ${uid} Operation Done`);       
              }).catch(error =>{
                console.error(error); 
              });  
            }
        }).catch(error => {
          console.error(error);
        })
      }).catch(error =>{
        console.error(error);
      })
    }
  }).catch(error => {
    console.error(error);
  });
}

