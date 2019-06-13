# chess-bet-functions
Chess Bet Functions

## Generate  credentials for nodmailer gmail SMTP transporter

### Steps
1. [Google API](https://console.developers.google.com/apis/credentials)
2. Select PROJECT/ Create NEW PROJECT
3. Create Credentials
4. Choose **OAuth Client ID**
5. If needed, just click Configure consent screen, supply information and click Save to return to Credentials screen.
6. Add Authorized URLS to [URL](https://developers.google.com/oauthplayground)
7. Hit create to create **clientID** and **clientSecret**
8. Open [OAuth Playground Page](https://developers.google.com/oauthplayground)
9. Enter https://mail.google.com/ to Authorize APIs section.
10. After clicking on Authorize APIs button, you need to choose google account for that API and allow access.
11. Now, we can Exchange authorization code for tokens, by clicking on the button with same text.


### Firebase Function Configs

**nodemailer auth creds**

```
firebase functions:config:set gmailservice.user=[SENDER_EMAIL] gmailservice.clientid=[CLIENT_ID] gmailservice.clientsecret=[CLIENT_SECRET] gmailservice.refreshtoken=[REFRESH_TOKEN] gmailservice.accesstoken=[ACCESS TOKEN]
```