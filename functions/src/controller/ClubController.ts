import { Response, Request } from 'firebase-functions';
import  {ClubAccount, Event} from '../domain/ClubAccount';
import {createClubAccount, getClubAccountInfo} from '../repository/ClubRepository';

/**
 * Create club account from frontends
 * @param req 
 * @param res 
 */

/**
 * Changes made on file (ClubController.ts)
 * -> replace .then callbacks with async await
 */

export const createClubAccountImplementation = async (req : Request, res: Response) => {
  const clubAccount = <ClubAccount> req.body;
  if (clubAccount.owner) {
    // Set Created Event To Club Account
   if(clubAccount.events) {
     clubAccount.events.push(Event.CREATED);
   } else {
    clubAccount.events = new Array();
    clubAccount.events.push(Event.CREATED);
   }

   try {
    await createClubAccount(clubAccount);
    res.status(200).send(clubAccount)
    console.log("Created Club Account");
   } catch(error) {
    console.log(error);
   }
  }
}

export const getClubAccountInfoImplementation = async (req: Request, res: Response) => {
 
  try {
    let clubAccountInfo = await getClubAccountInfo(req.query.uid, req.query.clubId);
    res.status(200).send(clubAccountInfo);
  } catch(error) {
    res.status(403).send(error);
  }
}