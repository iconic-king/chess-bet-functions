import { Response, Request } from 'firebase-functions';
import { ServiceAccountDTO, ServiceAccount, ProductAccount } from '../domain/ServiceAccount';
import { PaymentsApi } from '../api/PaymentsApi';
import { createServiceAccount, getServiceAccountByUserId } from '../repository/PaymentsRepository';
import { SavingsDTO } from '../domain/SavingsDTO';

export const createServiceAccountImplementation = async (req: Request, res: Response) => {
    try {
      const account = <ServiceAccountDTO> req.body;
      const productAccount = <ProductAccount> await PaymentsApi.createAccount(account);
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
                const account = <ProductAccount> await PaymentsApi.getAccount(servcieAccount);
                res.status(200).send(account);
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