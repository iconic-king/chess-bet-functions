import * as functions from 'firebase-functions';

/**
 * Author : Collins Magondu
 */

export const helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hi from collins!");
});
