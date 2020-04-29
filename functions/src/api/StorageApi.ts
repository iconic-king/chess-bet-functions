import { MatchResult } from "../service/MatchService";
import * as admin from 'firebase-admin';
import { PGNObject } from "../domain/PGNObject";

const storage = admin.storage();
import fileSystem from 'fs';
// tslint:disable-next-line: no-implicit-dependencies
import uuidv4 from 'uuid/v4';


export const writeFilePromise = (file: string, data: string): Promise<string> => {
    return new Promise((res,rej) => {
        fileSystem.writeFile(file, data, (error) => {
            if(error) {
                rej(error);
            } else {
                res(file);
            }
        });
    });
}

export const unlinkPromise = (file: string) => {
    fileSystem.unlinkSync(file);
}

export class StorageApi {
   static async storeGamePGN (white: string, black: string, event: string, matchResult: MatchResult, result: string) {
        const accessToken = uuidv4(); 
        const file = await writeFilePromise (`/tmp/${matchResult.matchId}.pgn`,
        new PGNObject(white, black, event, matchResult.pgnText, result).toString());
        const data = await storage.bucket().upload(file, {
        destination: `games/${matchResult.matchId}.pgn`,
        predefinedAcl: "authenticatedRead",
        metadata: {
            metadata: {
                firebaseStorageDownloadTokens : accessToken
            }
        }
        });
        const urls = await data[0].getSignedUrl({
            action: 'read',
            expires: '10-12-2100'
        });
        unlinkPromise(file);
        return urls[0];
    }
}