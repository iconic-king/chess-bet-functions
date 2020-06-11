/**
 * @author Collins Magondu
 */

import { Request, Response } from "firebase-functions";
import {auth} from "firebase-admin";

/**
 * Used for token evaluation to ensure request proccessed come from our apps
 */
export async function verifyToken(req: Request, res: Response, next: Function) {
    
    let authToken: string|undefined = req.headers.authorization;
    authToken = (authToken || '');
    authToken = <string> authToken.split(" ").pop();
    
    try {
        await auth().verifyIdToken(authToken);
        next();
    } catch(error){
        console.error(error);
        res.status(403).send(error); 
    }
}