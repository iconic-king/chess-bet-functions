import { ServiceAccount, ServiceAccountDTO } from "../domain/ServiceAccount";
import { DirectTransactionDTO } from "../domain/DirectTransactionDTO";
import { createPostRequestPromise, createGetRequestPromise } from "../utils/Request";
import { SavingsDTO } from "../domain/SavingsDTO";
import { TransactionDetails } from '../domain/Transaction';

const functions = require('firebase-functions');


export class PaymentsApi {
    public static createAccount(serviceAccount: ServiceAccountDTO) {
        serviceAccount.serviceId = parseInt(functions.config().payments.serviceid, 10); // Default service set in the product
        const options = {
            url: `${functions.config().payments.link}/account/createAccount`,
            json: serviceAccount
        }
        console.log(options);
        return createPostRequestPromise(options);
    }

    public static makeDirectTransaction(directTransaction: DirectTransactionDTO) {
        const options = {
            url: `${functions.config().payments.link}/account/transact`,
            json: directTransaction
        }
        return createPostRequestPromise(options);
    }

    public static getAccount(serviceAccount: ServiceAccount) {
       const url = `${functions.config().payments.link}/account/${serviceAccount.accountId}`;
       return createGetRequestPromise(url);
    }

    public static initiateDararaSavings (savingsDTO: SavingsDTO) {
        const options = {
            url: `${functions.config().payments.link}/daraja/initiate`,
            json: savingsDTO
        }
        return createPostRequestPromise(options);
    }

    public static getTransactionByType (transactionDetails: TransactionDetails) {
        const  url =  `${functions.config().payments.link}/account/transactionByType?phoneNumber=${transactionDetails.phoneNumber}&&type=${transactionDetails.type}`;
        return createGetRequestPromise(url);
    }
}