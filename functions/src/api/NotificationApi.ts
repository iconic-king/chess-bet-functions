import { EmailMessage } from '../domain/Notification';

const functions = require('firebase-functions');
// tslint:disable-next-line: no-implicit-dependencies
const nodemailer = require('nodemailer');

// Account auth
const gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: functions.config().email.address,
        pass: functions.config().email.password
    }
});
export class NotificationApi {
    static sendMail (message: EmailMessage): Promise<string> {
        message.from = `Chess MVP <${functions.config().email.address}>`;        
        return new Promise((res, rej) => {
            gmailTransporter.sendMail(message, (err, info) => {
                if(err) {
                    rej(err)
                } else {
                    res(info);
                }
            });
        });
    }
}