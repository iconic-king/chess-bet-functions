[![Build Status](https://travis-ci.com/Magz8984/chess-bet-functions.svg?token=1t1EwrDpq3sLA8yRH7Ea&branch=master)](https://travis-ci.com/Magz8984/chess-bet-functions)
## chess-bet-functions
Chess Bet Functions

#### Firebase Function Configs

**nodemailer auth creds**

```
firebase functions:config:set gmailservice.user=[SENDER_EMAIL] gmailservice.clientid=[CLIENT_ID] gmailservice.clientsecret=[CLIENT_SECRET] gmailservice.refreshtoken=[REFRESH_TOKEN] gmailservice.accesstoken=[ACCESS TOKEN]
```

***admin use only** import user accounts*

```
firebase auth:import users.json --hash-algo=scrypt --rounds=8 --mem-cost=14
```


#### Updates
. Update Firebase Functions
```
npm install --save firebase-functions@latest
```

#### Match Queue

**Specs**

```
    const spec_1 = {
        in_progress_state: "matchable_account_creation_in_progress",
        finished_state: "matchable_account_creation_finished",
    }
```

#### Security

. Deploy Database Rules
```
firebase deploy --only firestore:rules
firebase deploy --only database:rules
```


### Running Functions Locally With ENV Variabled
```
cd functions
```
- Imports vars deployed to cloud functions
```
firebase functions:config:get > .runtimeconfig.json
```
- Starts Cloud Functions
```
firebase functions:shell
```