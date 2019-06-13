import * as admin from 'firebase-admin';

admin.initializeApp();

const firestoreDatabase = admin.firestore();

const createUserAccount =  (uid:string) => {
  const date = new Date().toLocaleTimeString();

  const documentReference = firestoreDatabase.collection("accounts").add({
  date_created: date,
  last_date_modified: date,
  terms_condition_accepted: false,
  events:{
    "CREATED" : date
  },
  status : "PENDING",
  amount : 0,
  currency : "" ,
  owner : uid
  }).then(()=>{
    console.log("User Account Created Successfully");
  }).catch((error)=>{
    console.log(error.message)
  })

  firestoreDatabase.collection("users").doc(uid).update({
    account_ref : documentReference  
  }).then(()=>{
    console.log("User References Account");
  }).catch((error)=>{
    console.log(error.message)
  })
}

// Initialize user and user account in firestore
export const createUser = (user:admin.auth.UserRecord)=>{
 const date = new Date().toDateString();
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







