import { auth } from 'firebase-admin';
import {createUser, createUserAccount, getUserByEmail} from '../repository/UserRepository'

export const createUserAccountImplementation = (user : auth.UserRecord) => {
    getUserByEmail(user).then((snapshot)=>{
        if(snapshot.size === 0){
            createUser(user).then(()=>{
                createUserAccount(user.uid).then(() => {
                   console.log("User Created Succesfully");
                }).catch((error)=>{
                 console.log(error.message);
                });
            }).catch((error)=>{
               console.log(error.message);
            });
        }
        else {
            throw new Error("User Account Exists");
        }
    }).catch((err)=>{
        console.error(err);
    });

}