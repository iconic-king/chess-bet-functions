import * as admin from 'firebase-admin';

admin.initializeApp();

export const inituser = (user:admin.auth.UserRecord)=>{
 const firestore_db = admin.firestore();
 const date = new Date().toDateString();
 console.log(date,user);
 
 firestore_db.collection("users").doc(user.uid).set({
   email: user.email,
   uid: user.uid,
   disabled: user.disabled,
   date_created:date ,
   date_modified:date ,
   }).then(()=>{
   console.log("User Created Successfully")
 }).catch((error)=>{
    console.log(error.message)
 });
}
