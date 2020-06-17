import {createUser, createUserAccount, getUserByEmail, deleteUserAccount, updateUser, updateUserPermissions} from '../repository/UserRepository'
import { auth } from 'firebase-admin';
import { removeMatchable } from '../repository/MatchRepository';
import { UserService } from '../service/AccountService';
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
        await createUser(user)
        await createUserAccount(user.uid)
        // Handle Service Account Creation
        if(phoneNumber) {
            // Fetch Account
            const account = await getServiceAccountByPhoneNumber(phoneNumber);
            let serviceAccount = <ServiceAccount> {
                name : phoneNumber,
                phoneNumber : phoneNumber,
                userId : user.uid,
            };
            if(account) {
                serviceAccount.accountId = account.accountId;
                await createServiceAccount(serviceAccount);
            } else {
                // Create Account In Payments Service
                const paymentAccount = <PaymentAccount> await PaymentsApi.createAccount(<ServiceAccountDTO> {
                    userId: user.uid,
                    email: "",
                    name: phoneNumber,
                    phoneNumber: phoneNumber
                });
                if (paymentAccount.id) {
                    serviceAccount = <ServiceAccount> {
                        accountId : paymentAccount.id,
                        email : paymentAccount.email,
                        name : phoneNumber,
                        phoneNumber : phoneNumber,
                        userId : paymentAccount.userId
                    };
                    await createServiceAccount(serviceAccount);
                } else {
                    throw new Error("Payments Service Encountered Error")
                }
            }
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