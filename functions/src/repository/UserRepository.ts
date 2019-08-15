import * as admin from 'firebase-admin';
import { AccountService,AccountEvent, AccountStatus, UserService } from '../service/AccountService';
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
    status : AccountStatus.PENDING,
    amount : 0,
    currency : "" ,
    elo_rating : MIN_ELO_RATING ,
    owner : uid,
    matches:[]
  }
  return firestoreDatabase.collection("accounts").add({account});
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

