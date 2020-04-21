import { SwissTournament } from "../domain/Tournament";
import { SwissParingOutput } from "../domain/ParingOutput";

const functions = require('firebase-functions');
const request = require('request');

export class TPSApi {
    static validateSwissTournament (tournament: SwissTournament) {
        const options = {
            url: functions.config().tps.link + '/tournament/swiss/validate',
            json: tournament
        }
        return new Promise(function(resolve, reject) {
            request.post(options, function(error, response)  {
                if(error) {
                    console.error(error);
                    reject({err: error});
                } else {
                    resolve(response.body)
                }
            })
        });
    }

    static getSwissParingOutput (tournament: SwissTournament) {
        const options = {
            url: functions.config().tps.link + '/tournament/swiss/pair',
            json: tournament
        }
        return new Promise(function(resolve, reject) {
            request.post(options, function(error, response)  {
                if(error) {
                    console.error(error);
                    reject({err: error});
                } else {
                    resolve(<Array<SwissParingOutput>> response.body);
                }
            })
        });
    }
}