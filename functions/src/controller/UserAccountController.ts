import { auth } from 'firebase-admin';
import {createUser, createUserAccount} from '../repository/UserRepository'

export const createUserAccountImplementation = (user : auth.UserRecord) =>{
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