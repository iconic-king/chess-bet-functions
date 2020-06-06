import {createUser, createUserAccount, getUserByEmail, deleteUserAccount, updateUser, updateUserPermissions} from '../repository/UserRepository'
import { auth } from 'firebase-admin';
import { removeMatchable } from '../repository/MatchRepository';
import { UserService } from '../service/AccountService';
import { Response, Request } from 'firebase-functions';
import { UserPermissionDTO } from '../domain/UserPermissionDTO';
import { getServiceAccountByPhoneNumber, createServiceAccount} from '../repository/PaymentsRepository';

import { ServiceAccount, ProductAccount, ServiceAccountDTO } from '../domain/ServiceAccount';
import { PaymentsApi } from '../api/PaymentsApi';

export  const createUserAccountImplementation = async (user : auth.UserRecord) =>  {
    const snapshot = await getUserByEmail(user);
    if(snapshot.size === 0){
        await createUser(user)
        await createUserAccount(user.uid)
        // Handle Service Account Creation
        if(user.phoneNumber) {
            // Fetch Account
            const phoneNumber = user.phoneNumber.replace('+','');
            const account = await getServiceAccountByPhoneNumber(phoneNumber);
            let serviceAccount = new ServiceAccount();
            serviceAccount.userId = user.uid;
            serviceAccount.phoneNumber = phoneNumber;
            serviceAccount.name = phoneNumber;
            if(account) {
                serviceAccount.accountId = account.accountId;
                await createServiceAccount(serviceAccount);
            } else {
                // Create Account In Payments Service
                const productAccount = <ProductAccount> await PaymentsApi.createAccount(<ServiceAccountDTO> {
                    userId: user.uid,
                    email: "",
                    name: phoneNumber,
                    phoneNumber: phoneNumber
                });
                if (productAccount.id) {
                    serviceAccount = <ServiceAccount> {
                        accountId : productAccount.id,
                        email : productAccount.email,
                        name : phoneNumber,
                        phoneNumber : phoneNumber,
                        userId : productAccount.userId
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