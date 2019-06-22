/**
 * @author Collins Magondu
 */
import * as admin from 'firebase-admin';

admin.initializeApp();
const firestoreDatabase = admin.firestore();

export const createUserAccount =  (uid:string) => {
  const date = new Date().toLocaleString();
  return firestoreDatabase.collection("accounts").add({
  date_created: date,
  last_date_modified: date,
  terms_condition_accepted: false,
  events:{
    "CREATED" : {
      name : "CREATED",
      date_created: date,
      done: true
    }
  },
  status : "PENDING",
  amount : 0,
  currency : "" ,
  elo_rating : 100 ,
  owner : uid
  });
}

// Initialize user and user account in firestore
export const createUser = (user:admin.auth.UserRecord) => {
 const date = new Date().toLocaleString();
 return firestoreDatabase.collection("users").doc(user.uid).set({
   email: user.email,
   uid: user.uid,
   disabled: user.disabled,
   date_created:date ,
   date_modified:date ,
   });
}







