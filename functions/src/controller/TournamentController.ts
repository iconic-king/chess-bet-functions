import { Response, Request } from 'firebase-functions';
import { TPSApi } from '../api/TPSApi';
import { SwissTournament, Tournament, PlayerSection, Round, CreateRoundFactory } from '../domain/Tournament';
import { ParingAlgorithm } from '../domain/ParingAlgorithm';
import { createSwissTournament, addPlayersToTournament, getTournamentByID, matchOnSwissParings, updateObject, updateTournament, updatePlayerRounds, setTournamentPlayerIsActive, setTournamentLockedState } from '../repository/TournamentRepository';
import { ParingOutput } from '../domain/ParingOutput';
import { Alliance } from '../domain/Alliance';
import { MatchResult, getResult, MatchStatus } from '../service/MatchService';
import { getMatchableAccount } from '../repository/MatchRepository';
import { MatchedPlayOnlineTournamentAccount } from '../service/AccountService';
import { StorageApi } from '../api/StorageApi';
import { EmailMessage, TournamentNotification } from '../domain/Notification';
import { NotificationApi } from '../api/NotificationApi';

const cors = require('cors')({origin: true});

async function sendMailToTournamentPlayers (tournament: SwissTournament, tournamentNotification: TournamentNotification) {
    const emails = tournament.players.map(player => {
        return player.email
    });                
    if(emails.length > 0) {
        const message = <EmailMessage> {
            from: 'Chess MVP',
            to: emails,
            text: tournamentNotification.text,
            subject: tournamentNotification.subject
        }

       const result = await new Promise( async(res, rej) => {
            try {
                await NotificationApi.sendMail(message);
                res(true);
            } catch (error) {
                console.error(error);
                rej(false);
            }
        });
        return result;
    }
}

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
        res.status(403).send(error);
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

export const setPlayerActiveState = async (req: Request, res: Response) => {
    try {
        const playerUID = req.query.playerUID;
        const tournamentId = req.query.tournamentId;
        const isActive = req.query.isActive;

        if(playerUID && tournamentId && isActive !== undefined) {
            const tournament = await setTournamentPlayerIsActive(playerUID, tournamentId, isActive);
            if(tournament) {
                res.status(200).send(tournament);  
            }
        }
    } catch(error) {
        res.status(403).send({err : error});
        return;
    }
    res.status(403).send({err : "Invalid Request"});
};

export const setLockedStateOfTournament = async (req: Request, res: Response) => {
    try {
        const tournamentId = req.query.tournamentId;
        const isLocked = req.query.isLocked;
        if(isLocked !== undefined && tournamentId) {
            const tournament = await setTournamentLockedState(tournamentId, isLocked);
            if(tournament) {
                res.status(200).send(tournament);  
            }
        }
    } catch(error) {
        res.status(403).send({err : error});
        return;
    }
    res.status(403).send({err : "Invalid Request"});
};

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
                        const round:  Round = {
                            playerNumber : '0000',
                            scheduledColor: Alliance.NOALLIANCE,
                            result: 'U', //unpaired by the system,
                            matchUrl: ''
                        }
                        player.rounds.push(round);
                    } else if (player.rounds.length < tournament.numbeOfRoundsScheduled) {
                        // Set Unknown Bye When User Previous Rounds Were not set
                        const round:  Round = {
                            playerNumber : '0000',
                            scheduledColor: Alliance.NOALLIANCE,
                            result: 'U', //unpaired by the system,
                            matchUrl: ''
                        }
                        player.rounds.push(round);
                    }
                }
                // Get Parings From Next User
                const paringOutput = <ParingOutput> await TPSApi.getSwissParingOutput(tournament);
                if(paringOutput.pairs) {
                    const map = matchOnSwissParings(paringOutput, tournament);
                    // Validate the tournament state after parings have been added
                    const response = <SwissTournament> await TPSApi.validateSwissTournament(tournament);
                    if(response.name) {
                        // Valid Response
                        const swissTournament = await updateTournament(tournament);
                        const object = await updateObject(map);
                        const tournamentNotification = <TournamentNotification> {
                            text: `Tournament Round ${tournament.numbeOfRoundsScheduled} login to play !! Success in your match 😊`,
                            subject: `TOURNAMENT ROUND  ${tournament.numbeOfRoundsScheduled} IS ON !!`
                        }
                        const result = await sendMailToTournamentPlayers(tournament, tournamentNotification);
                        if(result) {
                            console.log("Messages Sent");
                        } else {
                            console.error("Messages Have Not Been Sent"); 
                        }
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


export const evaluateTournamentMatchImplementation = async (req: Request, res: Response) => {
    const matchResult = <MatchResult> req.body;
    const tournamentId = req.query.tournamentId;
    try  {
        if(matchResult && tournamentId) {
            const gainAccountSnapshot = await getMatchableAccount(matchResult.gain);
            const lossAccountSnapshot = await getMatchableAccount(matchResult.loss);            
            if(lossAccountSnapshot.exists() && gainAccountSnapshot.exists()) {
                const gainAccount = <MatchedPlayOnlineTournamentAccount> gainAccountSnapshot.val();
                const lossAccount = <MatchedPlayOnlineTournamentAccount> lossAccountSnapshot.val();
                let tournament: any;
                if(gainAccount.isForTournament && lossAccount.isForTournament) {
                    let gainRound: Round;
                    let lossRound:Round;
                    const white = gainAccount.sidePlayed === Alliance.WHITE ? lossAccount.opponent : gainAccount.opponent;
                    const black = gainAccount.sidePlayed === Alliance.BLACK ? lossAccount.opponent : gainAccount.opponent;
                    const match = await StorageApi.storeGamePGN(white, black, "Chess MVP Tournament", matchResult, getResult(matchResult, gainAccount.sidePlayed));
                    if(matchResult.matchStatus === MatchStatus.DRAW) {
                        gainRound = CreateRoundFactory(gainAccount.oppenentRank.toString(), gainAccount.sidePlayed, '=', match);
                        lossRound = CreateRoundFactory(lossAccount.oppenentRank.toString(), lossAccount.sidePlayed, '=', match);     
                    } else if (matchResult.matchStatus === MatchStatus.ABANDONMENT) { // In the event of a forfeit
                        gainRound = CreateRoundFactory(gainAccount.oppenentRank.toString(), gainAccount.sidePlayed, '+', match);
                        lossRound = CreateRoundFactory(lossAccount.oppenentRank.toString(), lossAccount.sidePlayed, '-', match);
                    } else {
                        gainRound = CreateRoundFactory(gainAccount.oppenentRank.toString(), gainAccount.sidePlayed, '1', match);
                        lossRound = CreateRoundFactory(lossAccount.oppenentRank.toString(), lossAccount.sidePlayed, '0', match);
                    }
                    tournament = await updatePlayerRounds(tournamentId, lossAccount.oppenentRank, gainRound, gainAccount.oppenentRank, lossRound);
                    if(tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
                        tournament = <SwissTournament> tournament;
                        tournament = <SwissTournament> await TPSApi.validateSwissTournament(tournament);
                        if(tournament.name) {
                            res.status(200).send(tournament);
                            return;
                        }
                    }
                }
            }
        }
    }catch (error) {
        console.error(error);
    }
    res.status(403).send({err: "Invalid Request"});
}

export const sendNotificationToTournamentPlayers =  async (req: Request, res: Response) => {
    try {
        const tournamentNotification = <TournamentNotification> req.body;
        if(tournamentNotification) {
            const tournament = await getTournamentByID(tournamentNotification.tournamentId);
            if(tournament) {
                cors(req, res, async ()=> {
                   const result =  await sendMailToTournamentPlayers(tournament, tournamentNotification);
                   if(result) {
                    res.status(200).send(tournamentNotification);
                    return;
                   }
                });
            }            
        }
    } catch (error) {
        res.status(403).send({err: error});
        return;
    }
    res.status(403).send({err: "Error Occured"});
}

