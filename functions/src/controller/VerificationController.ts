import { Response, Request } from 'firebase-functions';
import { TwiloVerificationDTO, TwiloVerificationService, TwiloVerificationCode } from '../domain/VerificationService';

const functions = require('firebase-functions');
const client = require('twilio') (functions.config().twilio.accountsid, functions.config().twilio.authtoken);

export const sendTwilioVerificationCode = async (req: Request, res: Response) => {
    const verifiactionDTO  = <TwiloVerificationDTO> req.body;
    try {
        if(verifiactionDTO.channel && verifiactionDTO.phoneNumber) {
            const response = <TwiloVerificationService> await client.verify.services(functions.config().twilio.servicesid)
            .verifications.create({to: verifiactionDTO.phoneNumber, channel: verifiactionDTO.channel});
            res.status(200).send(response);
            return;
        }
    } catch(error)  {
        console.error(error);
        res.status(403).send({err : error});
        return;
    }
    res.status(403).send({err : 'Verification Error'});
}

export const verifyTwilioVerificationCode = async (req: Request, res: Response) => {
    const verificationCode  = <TwiloVerificationCode> req.body;
    try {
        if(verificationCode.code && verificationCode.phoneNumber) {            
            const response = <TwiloVerificationService> await client.verify.services(functions.config().twilio.servicesid)
            .verificationChecks.create({to: verificationCode.phoneNumber, code: verificationCode.code});
            res.status(200).send(response);
            return;
        }
    } catch(error)  {
        console.error(error);
        res.status(403).send({err : error});
        return;
    }
    res.status(403).send({err : 'Verification Error'});
}