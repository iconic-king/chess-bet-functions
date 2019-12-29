import { Request, Response } from "firebase-functions";
import {auth} from "firebase-admin";


export function verifyToken(req: Request, res: Response, callback: Function) {
    let authToken :string|undefined =  req.headers.authorization;
    authToken = (authToken || '' );
    authToken = authToken.split(" ")[1];
    console.log("Token Data :  " + authToken);
    
    auth().verifyIdToken(authToken).then(() => {
        callback();
    }).catch(error => {
        console.error(error);
        res.status(403).send(error);    
    })
}