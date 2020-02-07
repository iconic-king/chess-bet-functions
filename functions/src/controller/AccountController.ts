import {createUser, createUserAccount, getUserByEmail, deleteUserAccount, updateUser, updateUserPermissions} from '../repository/UserRepository'
import { auth } from 'firebase-admin';
import { removeMatchable } from '../repository/MatchRepository';
import { UserService } from '../service/AccountService';
import { Response, Request } from 'firebase-functions';
import { UserPermissionDTO } from '../domain/UserPermissionDTO';

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
            // TODO reconsider removng this block
            throw new Error("User Account Exists");
        }
    }).catch((err)=>{
        console.error(err);
    });

}

export const onUserAccountDeleted = (user: auth.UserRecord) => {
    deleteUserAccount(user.uid);
    removeMatchable(user.uid, () => {
        console.log("Removed Matchable Account");
    });
}

export const onUserUpdate = (req: Request, res: Response) => {
    const user = <UserService> req.body;
    updateUser(user).then((snapshot)=> {
        res.status(403).send(snapshot.writeTime);
    }).catch(error => {
        res.status(403).send(error);
    });
}

export const onUserPermmissionsUpdate = (req: Request, res: Response) => {
    const userPermissionDTO  = <UserPermissionDTO> req.body;
    updateUserPermissions(userPermissionDTO.uid, () => {
        res.send(userPermissionDTO);
    }, (error) => {
        res.status(403).send(error);
    }, userPermissionDTO.permissions);
}