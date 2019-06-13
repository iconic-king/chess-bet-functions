import * as functions from 'firebase-functions';
import * as usercreation from './usercreation'
const nodemailer = require("nodemailer");

/**
 * Author : Collins Magondu
 */

async function sendMail(email:string,subject:string,body:string){
 const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: functions.config().gmailservice.user,
        pass: functions.config().gmailservice.pass
    }
 });

 const info = await transporter.sendMail({
    from:functions.config().gmailservice.user,
    to: `${email}`,
    subject: subject,
    text: body
 })

console.log("Message sent : " + info.messageId);
return info.messageId;
}


export const onUserCreated = functions.auth.user().onCreate((user) => {
    const strUser= JSON.stringify(user.email);
    usercreation.inituser(user);
    sendMail(strUser,"Hello","Welcome to chess bet").catch(console.error);
});