import * as admin from 'firebase-admin';
import { ServiceAccount } from '../domain/ServiceAccount';

const firestoreDatabase = admin.firestore();

const serviceAccountCollection = "service_accounts";

export const getServiceAccountByUserId = async (userId: string) => {
    const accountsSnapshot = await firestoreDatabase.collection(serviceAccountCollection).where('userId', '==', userId).get();
    if(!accountsSnapshot.empty){
        return <ServiceAccount> accountsSnapshot.docs[0].data();
    }
    return null;
}

export const createServiceAccount = async (serviceAccount: ServiceAccount) => {
    const account = await getServiceAccountByUserId(serviceAccount.userId);
    console.log(account);
    if(account) {
        throw new Error('User Has An Existing Account');
    }

    serviceAccount.id = firestoreDatabase.collection(serviceAccountCollection).doc().id;    
    return firestoreDatabase.collection(serviceAccountCollection).doc(serviceAccount.id).set(serviceAccount)
}

