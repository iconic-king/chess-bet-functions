import {createUser, createUserAccount, getUserByEmail, deleteUserAccount, updateUser, updateUserPermissions} from '../repository/UserRepository'
import { auth } from 'firebase-admin';
import { removeMatchable } from '../repository/MatchRepository';
import { UserService, UserType } from '../service/AccountService';
import { Response, Request } from 'firebase-functions';
import { UserPermissionDTO } from '../domain/UserPermissionDTO';
import { getServiceAccountByPhoneNumber, createServiceAccount} from '../repository/PaymentsRepository';

import { ServiceAccount, ServiceAccountDTO, PaymentAccount } from '../domain/ServiceAccount';
import { PaymentsApi } from '../api/PaymentsApi';

export  const createUserAccountImplementation = async (user : auth.UserRecord) =>  {
    let phoneNumber;
    if(!user.email && user.phoneNumber) {
        phoneNumber = user.phoneNumber.replace('+','');
        user.email =  phoneNumber;
    }
    const snapshot = await getUserByEmail(user);
    if(snapshot.size === 0){
        if(phoneNumber) {
            // Handle Service Account Creation
            await createUser(user, UserType.CHESS_BET);
            await createUserAccount(user.uid);
            // Fetch Account
            const account = await getServiceAccountByPhoneNumber(phoneNumber);
            let serviceAccount = <ServiceAccount> {
                name : phoneNumber,
                phoneNumber : phoneNumber,
                userId : user.uid
            };
            if(account) {
                serviceAccount.accountId = account.accountId;
                await createServiceAccount(serviceAccount);
            } else {
                // Create Account In Payments Service
                const paymentAccount = <PaymentAccount> await PaymentsApi.createAccount(<ServiceAccountDTO> {
                    email: "",
                    name: phoneNumber,
                    phoneNumber: phoneNumber
                });
                if (paymentAccount.id) {
                    serviceAccount = <ServiceAccount> {
                        accountId : paymentAccount.id,
                        email : paymentAccount.phoneNumber,
                        name : phoneNumber,
                        phoneNumber : phoneNumber,
                        userId : user.uid
                    };
                    await createServiceAccount(serviceAccount);
                } else {
                    throw new Error("Payments Service Encountered Error")
                }
            }
        } else {
            // Handle Service Account Creation
            await createUser(user, UserType.CHESS_MVP);
            await createUserAccount(user.uid);
        }
        console.log("User Created Succesfully");
    } else {
        // TODO reconsider removng this block
        throw new Error("User Account Exists");
    }
}

export const onUserAccountDeleted = async (user: auth.UserRecord) => {
    await deleteUserAccount(user.uid);
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

export const onUserPermmissionsUpdate = async (req: Request, res: Response) => {
    const userPermissionDTO  = <UserPermissionDTO> req.body;
    try {
        await updateUserPermissions(userPermissionDTO.uid, userPermissionDTO.permissions);
        res.send(userPermissionDTO);
    } catch (error) {
        res.status(403).send(error);
    }
}