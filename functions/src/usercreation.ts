import * as admin from 'firebase-admin';

admin.initializeApp();

const firestoreDatabase = admin.firestore();

const createUserAccount =  (uid:string) => {
  const date = new Date().toLocaleString();

  firestoreDatabase.collection("accounts").add({
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
  }).then(()=>{
    console.log("User Account Created Successfully");
  }).catch((error)=>{
    console.log(error.message)
  })
}

// Initialize user and user account in firestore
export const createUser = (user:admin.auth.UserRecord) => {
 const date = new Date().toLocaleString();
 firestoreDatabase.collection("users").doc(user.uid).set({
   email: user.email,
   uid: user.uid,
   disabled: user.disabled,
   date_created:date ,
   date_modified:date ,
   }).then(()=>{
   console.log("User Created Successfully");
 }).catch((error)=>{
    console.log(error.message)
 });
 createUserAccount(user.uid);
}







