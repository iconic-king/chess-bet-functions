import * as admin from 'firebase-admin';
import { AccountService,AccountEvent, UserService, Permission } from '../service/AccountService';
/**
 * @author Collins Magondu
 */
/**
 * Changes made on file (UserRepostiory.ts)
 * -> Replaced .then callbacks with async await
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
  permissions:[],
  user_name : (!user.displayName) ? 'anonymous' : user.displayName,
  profile_photo_url : (!user.photoURL) ? '' : user.photoURL,
  fcmToken: ''
 }

 return firestoreDatabase.collection("users").doc(user.uid).set(user_account);
}

export const getUserByEmail = (user: admin.auth.UserRecord) => {
  return firestoreDatabase.collection("users").where('email', "==", user.email).get();
}

export const getUserByUID = (uid: string) => {
  return firestoreDatabase.collection("users").where("uid", "==", uid).get();
}

export const updateUser = (user: UserService) => {
  return firestoreDatabase.collection("users").doc(user.uid).set(user);
}

export const updateUserPermissions = async (uid: string, permissions: Array<Permission>) => {
    const snapshot = await getUserByUID(uid);
    const user = <UserService> snapshot.docs[0].data();
    user.permissions = (user.permissions === undefined) ? new Array() : user.permissions; 
    permissions.forEach(permission => {
      user.permissions.push(permission);
    });
    await updateUser(user);
    return user;
}

export const getUserAccount = (uid:string) => {
  return firestoreDatabase.collection('accounts').where('owner',"==",uid);
}

export const updateAccount = (account: AccountService) => {
  const query = getUserAccount(account.owner);

  return firestoreDatabase.runTransaction( async result => {
    const snapshot = await result.get(query);
    if(!snapshot.empty){
      const doc = snapshot.docs[0].ref;
      result.update(doc, account)
    }
  });
}

export const deleteUserAccount = async (uid: string) =>{

  try {
    const snapshots = await getUserByUID(uid);
    if(!snapshots.empty){
      const doc = snapshots.docs[0];
      // Delete user account
      await doc.ref.delete();
      const snapshot = await getUserAccount(uid).get();
      if(!snapshot.empty){
        const account = snapshot.docs[0];
        await account.ref.delete();
        console.log(`Deleted User ${uid} Operation Done`);
      }
    }
  } catch(error){
    console.log(error);
  }
}
