import { Response, Request } from 'firebase-functions';
import { ServiceAccountDTO, ServiceAccount, PaymentAccount } from '../domain/ServiceAccount';
import { PaymentsApi } from '../api/PaymentsApi';
import { createServiceAccount, getServiceAccountByUserId } from '../repository/PaymentsRepository';
import { SavingsDTO } from '../domain/SavingsDTO';
import { PayoutDTO } from '../domain/PayoutDTO';
import { TransactionType } from '../domain/Transaction';

export const createServiceAccountImplementation = async (req: Request, res: Response) => {
    try {
      const account = <ServiceAccountDTO> req.body;
      const productAccount = <PaymentAccount> await PaymentsApi.createAccount(account);
      if (productAccount.id) {
          console.log(productAccount);
            // After getting a servcie account back we store it in the database      
            const serviceAccount = <ServiceAccount> {
                accountId : productAccount.id,
                email : productAccount.email,
                name : productAccount.name,
                phoneNumber : account.phoneNumber,
                userId : productAccount.userId
            };
            await createServiceAccount(serviceAccount);
            res.status(200).send(serviceAccount);
            return;
      }
    } catch (error) {
        res.status(403).send({err : error});
        return;
    }
    res.status(403).send({err : 'Invalid Request'});
}

export const getServiceAccountImplementation = async (req: Request, res: Response) => {
    try {
        const uid = req.query.userId;
        if(uid) {
            const servcieAccount = await getServiceAccountByUserId(uid);
            if (servcieAccount) {
                // Get it from payments service
                const account = <PaymentAccount> await PaymentsApi.getAccount(servcieAccount);
                res.status(200).send(account);
                return;
            } else {
                res.status(404).send({err : 'Not Found'});
                return;
            }
        }
    } catch(error) {
        res.status(403).send({err : error});
        return;
    }
    res.status(403).send({err : 'Invalid Request'});
}

export const initiateDarajaPaymentImplementation = async (req: Request, res: Response) => {
    try {
        const savings = <SavingsDTO> req.body;
        if(savings.phoneNumber) {
            const response = await PaymentsApi.initiateDararaSavings(savings);
            res.status(200).send(response);
            return;
        }
    } catch(error) {
        res.status(403).send({err : error});
        return;
    }
    res.status(403).send({err : 'Invalid Request'});
}


export const withDrawAmountImplementation = async (req: Request, res: Response) => {
    try {
        const payoutDTO = <PayoutDTO> req.body;
        const response = await PaymentsApi.payout(payoutDTO)
        res.status(200).send(response);
        return;
    } catch (error) {
        res.status(403).send({err : error});
    }
    res.status(403).send({err : 'Invalid Request'});
}

export const getTransactionsImplementation = async (req: Request, res: Response) => {
    try {
        const phoneNumber = req.params.phoneNumber;
        let transactions = await PaymentsApi.getTransactionsByPhoneNumber(phoneNumber);
        res.status(200).send(transactions);
    } catch (error) {
        res.status(403).send({err : error});
    }
}

export const getTransactionsByTypeImplementation = async (req: Request, res: Response) => {
    try {
        const phoneNumber = req.params.phoneNumber;
        const type = <TransactionType> req.params.type;

        let transactions = await PaymentsApi.getTransactionsByType(phoneNumber, type);
        res.status(200).send(transactions);
    } catch (error) {
        res.status(403).send({err : error});
    }
}