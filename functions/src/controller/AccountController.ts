import {createUser, createUserAccount, getUserByEmail, deleteUserAccount, updateUser, updateUserPermissions} from '../repository/UserRepository'
import { auth } from 'firebase-admin';
import { removeMatchable } from '../repository/MatchRepository';
import { UserService } from '../service/AccountService';
import { Response, Request } from 'firebase-functions';
import { UserPermissionDTO } from '../domain/UserPermissionDTO';

export const createUserAccountImplementation = async (user : auth.UserRecord) => {

    try {
        let snapshot = await getUserByEmail(user);
        if(snapshot.size === 0){
            try {
                await createUser(user);
                await createUserAccount(user.uid);
                console.log("user Created Successfully");
            } catch (error){
                console.log(error.message);
            }
        } else {
            // TODO reconsider removng this block
            throw new Error("User Account Exists");
        }
    } catch (err){
        console.error(err);
    }
}

export const onUserAccountDeleted = async (user: auth.UserRecord) => {
    deleteUserAccount(user.uid);
    await removeMatchable(user.uid);
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