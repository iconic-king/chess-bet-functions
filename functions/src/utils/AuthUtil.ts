/**
 * @author Collins Magondu
 */

import { Request, Response } from "firebase-functions";
import {auth} from "firebase-admin";

/**
 * Used for token evaluation to ensure request proccessed come from our apps
 */
export function verifyToken(req: Request, res: Response, callback: Function) {
    let authToken :string|undefined =  req.headers.authorization;
    authToken = (authToken || '' );
    authToken = authToken.split(" ")[1];    
    auth().verifyIdToken(authToken).then(() => {
        callback();
    }).catch(error => {
        console.error(error);
        res.status(403).send(error);    
    })
}