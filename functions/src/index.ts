/**
 * @author Collins Magondu
 */

import * as functions from 'firebase-functions';
import * as usercreation from './usercreation'

export const onUserCreated = functions.auth.user().onCreate((user) => {
    usercreation.createUser(user).then(()=>{
        usercreation.createUserAccount(user.uid).then(() => {
           console.log("User Created Succesfully");
        }).catch((error)=>{
         console.log(error.message)
        });
    }).catch((error)=>{
       console.log(error.message)
    });
});