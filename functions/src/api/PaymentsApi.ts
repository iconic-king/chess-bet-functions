import { ServiceAccount, ServiceAccountDTO } from "../domain/ServiceAccount";
import { DirectTransactionDTO } from "../domain/DirectTransactionDTO";
import { createPostRequestPromise, createGetRequestPromise } from "../utils/Request";
import { SavingsDTO } from "../domain/SavingsDTO";
import { BetDTO } from "../domain/BetDTO";
import { BetSettlementDTO } from "../domain/BetSettlementDTO";
import { PayoutDTO } from "../domain/PayoutDTO";

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

    public static placeBet (betDTO: BetDTO) {
        const options = {
            url: `${functions.config().payments.link}/chess-bet/placeBet`,
            json: betDTO
        }
        return createPostRequestPromise(options);
    }

    public static settleBet (betSettleMentDTO: BetSettlementDTO) {
        const options = {
            url: `${functions.config().payments.link}/chess-bet/settleBet`,
            json: betSettleMentDTO
        }
        return createPostRequestPromise(options);
    }

    public static payout(payoutDTO: PayoutDTO) {
        const options = {
            url: `${functions.config().payments.link}/chess-bet/payout`,
            json: payoutDTO
        }
        return createPostRequestPromise(options);
    }

    // public static getTransactionsByType(phoneNumber: string, type: TransactionType) {
    //     const url = `${functions.config().payments.link}/account/transactionsByType?phoneNumber=${phoneNumber}&type=${type}`;
    //     return createGetRequestPromise(url);
    // }

    // public static getTransactionsByPhoneNumber(phoneNumber: string) {
    //     const url = `${functions.config().payments.link}/account/transactionsByPhoneNumber?phoneNumber=${phoneNumber}`;
    //     return createGetRequestPromise(url);
    // }
}