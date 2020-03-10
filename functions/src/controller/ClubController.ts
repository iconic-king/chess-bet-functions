import { Response, Request } from 'firebase-functions';
import  {ClubAccount} from '../domain/ClubAccount';
import {createClubAccount} from '../repository/ClubRepository';

/**
 * Create club account from frontends
 * @param req 
 * @param res 
 */

export const createClubAccountImplementation = (req : Request, res: Response) => {
  const clubAccount = <ClubAccount> req.body;
  if (clubAccount.owner) {
   createClubAccount(clubAccount).then(() => {
       res.status(200).send(clubAccount)
       console.log("Created Club Account");
   }).catch(error => {
        console.log(error);
   });
  }
}