import { FCMMessageService } from "../service/FCMMessageService";
import * as admin from 'firebase-admin';
import { Response, Request } from 'firebase-functions';


export const sendFCMMessage = (req : Request, res : Response) =>{
    const fcmMessage = <FCMMessageService> req.body;
    const message = {
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
    };
    console.log(message);
    
    admin.messaging().sendToDevice(fcmMessage.registrationTokens, message).then(response => {
        console.log(response.successCount + ' messages were sent successfully');
        res.status(200).send(response.successCount + ' messages were sent successfully');
    }).catch(error => {
        console.log(error);
        res.status(403).send(error);
    })
}