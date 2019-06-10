import * as functions from 'firebase-functions';
const nodemailer = require("nodemailer");
/**
 * Author : Collins Magondu
 */

async function sendMail(email:string,subject:string,body:string){
//  const testAccount = await nodemailer.createTestAccount();
   const name = email.split('@')[0];

 const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type : "oauth2",
        user: functions.config().gmailservice.user,
        clientId: functions.config().gmailservice.clientid,
        clientSecret: functions.config().gmailservice.clientsecret,
        refreshToken: functions.config().gmailservice.refreshtoken,
        accessToken:functions.config().gmailservice.accesstoken
    }
 });

 const info = await transporter.sendMail({
    from: '"Chess Bet <chessbetdevgmail.com>"',
    to: `${name}, ${email}`,
    subject: subject,
    text: body
 })

console.log("Message sent : " + info.messageId);
}


export const sendWelcomeEmail = functions.auth.user().onCreate((user) => {
    const strUser= JSON.stringify(user.email);
    sendMail(strUser,"Hello","Welcome to chess bet").catch(console.error);
});

