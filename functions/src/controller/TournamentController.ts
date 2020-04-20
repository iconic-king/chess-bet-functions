import { Response, Request } from 'firebase-functions';
import { TPSApi } from '../api/TPSApi';
import { SwissTournament, Tournament } from '../domain/Tournament';
import { ParingAlgorithm } from '../domain/ParingAlgorithm';
import { createSwissTournament } from '../repository/TournamentRepository';

export const validateTournamentImplementation = async (req : Request, res: Response) => {
    try  {
        const tournament = <Tournament> req.body;
        if (tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
            const response = await TPSApi.validateSwissTournament(<SwissTournament> req.body);
            res.status(200).send(response);
        } else {
            res.status(403).send({
                err: `No Tournament Of Type ${tournament.paringAlgorithm}`
            }) 
        }
    } catch(error) {
        res.status(403).send(error)
    }
}

export const getTournamentParingsImplementation = async (req : Request, res: Response) => {
    try  {
        const tournament = <Tournament> req.body;
        if (tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
            const response = await TPSApi.getSwissParingOutput(<SwissTournament> req.body);
            res.status(200).send(response);
        } else {
            res.status(403).send({
                err: `No Tournament Of Type ${tournament.paringAlgorithm}`
            }) 
        }
    } catch(error) {
        res.status(403).send(error)
    }
}

/**
 * Creates any type of tournament
 * @param req 
 * @param res 
 */
export const createTournament = async (req : Request, res: Response) => {
    try  {
        const tournament = <Tournament> req.body;
        if (tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
            if(tournament.authorUid) {
                await createSwissTournament(<SwissTournament> req.body);
                res.status(200).send(tournament);
            } else {
                res.status(403).send({
                    err: `Tournament Has No Author`
                }) 
            }
        } else {
            res.status(403).send({
                err: `No Tournament Of Type ${tournament.paringAlgorithm}`
            }) 
        }
    } catch(error) {
        res.status(403).send(error)
    }
}