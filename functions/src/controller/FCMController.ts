import { FCMMessageService } from "../service/FCMMessageService";
import * as admin from 'firebase-admin';
import { Response, Request } from 'firebase-functions';

export const CreateMessageFactory = (fcmMessage : FCMMessageService) => {
   return {
    notification : {
            body : fcmMessage.message,
            title : fcmMessage.from
        },
        data : {
            fromUID : fcmMessage.fromUID,
            fromUser : fcmMessage.from,
            messageType : fcmMessage.messageType.toString(),
            message: fcmMessage.message,
            data: fcmMessage.data
        }
    } 
}

export const sendMessage = async (fcmMessage: FCMMessageService) => {
    const message = CreateMessageFactory (fcmMessage);    
    return await admin.messaging().sendToDevice(fcmMessage.registrationTokens, message);
}

export const sendFCMMessage = async (req : Request, res : Response) =>{
    const fcmMessage = <FCMMessageService> req.body;
    try {
        const response  = await sendMessage(fcmMessage);
        res.status(200).send(response.successCount + ' messages were sent successfully');
    }catch (error) {
        res.status(403).send(error);
    }
}