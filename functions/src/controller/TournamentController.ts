import { Response, Request } from 'firebase-functions';
import { TPSApi } from '../api/TPSApi';
import { SwissTournament, Tournament, PlayerSection, Round } from '../domain/Tournament';
import { ParingAlgorithm } from '../domain/ParingAlgorithm';
import { createSwissTournament, addPlayersToTournament, getTournamentByID, matchOnSwissParings, updateObject, updateTournament } from '../repository/TournamentRepository';
import { ParingOutput } from '../domain/ParingOutput';
import { Alliance } from '../domain/Alliance';

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
export const createTournamentImplementation = async (req : Request, res: Response) => {
    try  {
        const tournament = <Tournament> req.body;
        // Create Swiss Tournament
        if (tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
            if(tournament.authorUid) {
                const result =  await createSwissTournament(<SwissTournament> req.body);
                if(result) {
                    res.status(200).send(tournament);
                } else {
                    res.status(403).send({err: `Tournament Has Invalid Format`});
                }
            } else {
                res.status(403).send({err: `Tournament Has No Author`});
            }
        } else {
            res.status(403).send({
                err: `No Tournament Of Type ${tournament.paringAlgorithm}`
        }) 
        }
    } catch(error) {
        res.status(403).send({err: error});
    }
}

export const addPlayersToTournamentImplementation = async (req : Request, res: Response) => {
    const players =  <Array<PlayerSection>> req.body;
    console.log(players[0]);
    try {
        const transaction = await addPlayersToTournament(req.query.tournamentId, players);
        if(transaction) {
            res.status(200).send(transaction);  
        } else {
            res.status(403).send({err : "Request Forbidden"})
        }
    } catch(error) {
        res.status(403).send({err : (error) ? error : "Request Forbidden"})
    }
}

export const scheduleTournamentMatchesImplementation = async (req : Request, res: Response) => {
    try {
        if(req.query.tournamentId) {
            const tournament = await getTournamentByID(req.query.tournamentId);
            // Change logic is more than one tournament type is possible
            if(tournament){
                // If played rounds are equivalent to the rounds to be played do not proceed
                if (tournament.numbeOfRoundsScheduled === tournament.rounds) {
                    res.status(200).send(tournament);
                    return;
                }

                for(const player of tournament.players) {
                    if(player.isActive === undefined) {
                        player.isActive = true;
                    } 
                    if(!player.isActive) {
                        const round = new Round();
                        round.playerNumber = '0000'
                        round.scheduledColor = Alliance.NOALLIANCE
                        round.result = 'U' //unpaired by the system
                        player.rounds.push(round);
                    }
                }
                
                console.log(tournament);
                // Get Parings From Next User
                const paringOutput = <ParingOutput> await TPSApi.getSwissParingOutput(tournament);
                console.log(paringOutput);

                if(paringOutput.pairs) {
                    const map = matchOnSwissParings(paringOutput, tournament);
                    // Validate the tournament state after parings have been added
                    const response = <SwissTournament> await TPSApi.validateSwissTournament(tournament);
                    if(response.name) {
                        // Valid Response
                        const swissTournament = await updateTournament(tournament);
                        const object = await updateObject(map);
                        if(swissTournament) {
                            res.status(200).send({
                                tournament: swissTournament,
                                updates: object
                            });
                            return;
                        }
                    }
                }    
            }
        }
        res.status(403).send({err : "Tournamnet Is Invalid"});
    } catch(error) {
        res.status(403).send({err : (error) ? error : "Request Forbidden"})
    }
}

