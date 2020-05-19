import { Response, Request } from 'firebase-functions';
import { TPSApi } from '../api/TPSApi';
import { SwissTournament, Tournament, PlayerSection, Round, CreateRoundFactory } from '../domain/Tournament';
import { ParingAlgorithm } from '../domain/ParingAlgorithm';
import { createSwissTournament, addPlayersToTournament, getTournamentByID, matchOnSwissParings, updateObject, updateTournament, updatePlayerRounds, setTournamentPlayerIsActive, setTournamentLockedState, addPlayerToTournament, getUserActiveTournaments } from '../repository/TournamentRepository';
import { ParingOutput } from '../domain/ParingOutput';
import { Alliance } from '../domain/Alliance';
import { MatchResult, getResult, MatchStatus } from '../service/MatchService';
import { removeTournamentMatch, getTournamentMatchableAccount, removeTournamentMatchable } from '../repository/MatchRepository';
import { MatchedPlayOnlineTournamentAccount } from '../service/AccountService';
import { StorageApi } from '../api/StorageApi';
import { EmailMessage, TournamentNotification } from '../domain/Notification';
import { NotificationApi } from '../api/NotificationApi';
import { TasksApi } from '../api/TasksApi';

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
        console.log(result);
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

/**
 * Allow an array players in a tournament (FREE TOURNAMENTS ONLY)
 * @param req 
 * @param res 
 */
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

/**
 * Allow one to be added as a player in a tournament
 * @param req 
 * @param res 
 */
export const addPlayerToTournamentImplementation = async (req : Request, res: Response) => {
    const player =  <PlayerSection> req.body;
    try {
        const activeTournaments = await getUserActiveTournaments(player.uid);
        if(!activeTournaments.empty){
            throw new Error('user in active tournament');
        }
        const transaction = await addPlayerToTournament(req.query.tournamentId, player);
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

        if(playerUID && tournamentId && req.query.isActive !== undefined) {
            const isActive = (req.query.isActive === 'true');
            const tournament = await setTournamentPlayerIsActive(playerUID, tournamentId, isActive);
            if(tournament) {
                res.status(200).send(tournament);  
                return;
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
                            result: '-', //unpaired by the system,
                            matchUrl: ''
                        }
                        player.rounds.push(round);
                    }
                }

                //Lock tournament before paring
                tournament.isLocked = true;
                await updateTournament(tournament)                

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
                        const tournamentNotification = <TournamentNotification> {
                            text: `Tournament Round ${tournament.numbeOfRoundsScheduled} login to play !! Success in your match 😊`,
                            subject: `TOURNAMENT ROUND  ${tournament.numbeOfRoundsScheduled} IS ON !!`
                        }
                        cors(req, res, async () => {
                            const result = await sendMailToTournamentPlayers(tournament, tournamentNotification);
                            if(result) {
                                console.log("Messages Sent");
                            } else {
                                console.error("Messages Have Not Been Sent"); 
                            }
                        });
                        // Schedule round after each player time * 2
                        const roundTTL = (Date.now() / 1000)  + ((tournament.matchDuration * 60 * 2) + 180);
                        const task = await TasksApi.createTournamentRoundSchedulingTask(tournament.id, roundTTL);
                        console.log('Next Round Time', task.name);
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
    } catch(error) {
        res.status(403).send({err : (error) ? error : "Request Forbidden"});
        return;
    }
    res.status(403).send({err : "Tournamnet Is Invalid"});
}


export const evaluateTournamentMatchImplementation = async (req: Request, res: Response) => {
    const matchResult = <MatchResult> req.body;
    const tournamentId = req.query.tournamentId;
    try  {
        if(matchResult && tournamentId) {
            const gainAccountSnapshot = await getTournamentMatchableAccount(matchResult.gain);
            const lossAccountSnapshot = await getTournamentMatchableAccount(matchResult.loss);            
            if(lossAccountSnapshot.exists() && gainAccountSnapshot.exists()) {
                const gainAccount = <MatchedPlayOnlineTournamentAccount> gainAccountSnapshot.val();
                const lossAccount = <MatchedPlayOnlineTournamentAccount> lossAccountSnapshot.val();
                let tournament: any;
                if(gainAccount.isForTournament && lossAccount.isForTournament) {
                    let gainRound: Round;
                    let lossRound:Round;
                    let white : string, black : string;
                    // Set Actual names as opposed to UIDs
                    if(matchResult.gainName && matchResult.lossName) {
                        white = gainAccount.sidePlayed === Alliance.WHITE ? matchResult.gainName : matchResult.lossName;
                        black = gainAccount.sidePlayed === Alliance.BLACK ? matchResult.gainName : matchResult.lossName; 
                    } else {
                        white = gainAccount.sidePlayed === Alliance.WHITE ? lossAccount.opponent : gainAccount.opponent;
                        black = gainAccount.sidePlayed === Alliance.BLACK ? lossAccount.opponent : gainAccount.opponent;
                    }
                    const match = await StorageApi.storeGamePGN(white, black, "Chess MVP Tournament", matchResult, getResult(matchResult, gainAccount.sidePlayed));
                    if(matchResult.matchStatus === MatchStatus.DRAW) {
                        gainRound = CreateRoundFactory(gainAccount.oppenentRank.toString(), gainAccount.sidePlayed, '=', match);
                        lossRound = CreateRoundFactory(lossAccount.oppenentRank.toString(), lossAccount.sidePlayed, '=', match);     
                    } else {
                        gainRound = CreateRoundFactory(gainAccount.oppenentRank.toString(), gainAccount.sidePlayed, '1', match);
                        lossRound = CreateRoundFactory(lossAccount.oppenentRank.toString(), lossAccount.sidePlayed, '0', match);
                    }
                    tournament = await updatePlayerRounds(tournamentId, lossAccount.oppenentRank, gainRound, gainAccount.oppenentRank, lossRound);
                    if(tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
                        tournament = <SwissTournament> tournament;
                        tournament = <SwissTournament> await TPSApi.validateSwissTournament(tournament);
                        // Remove Tournament Match After Evaluation
                        await removeTournamentMatch(matchResult.matchId);
                        await removeTournamentMatchable(gainAccount.owner);
                        await removeTournamentMatchable(lossAccount.owner);
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
                const promise = new Promise((resolve, reject) => {
                    cors(req, res, async ()=> {
                        const result =  await sendMailToTournamentPlayers(tournament, tournamentNotification);
                        if(result) {
                         resolve(result);
                        } else {
                         reject('Notification Not Sent');
                        }
                     });
                });
                await promise;
                res.status(200).send(tournamentNotification);
                return;
            }            
        }
    } catch (error) {
        res.status(403).send({err: error});
        return;
    }
    res.status(403).send({err: "Error Occured"});
}

export const getActiveUserTournamentsImplementation = async (req: Request, res: Response) => {
    try {
        const uid = req.query.uid;
        const tournaments = new Array<SwissTournament>();
        if(uid) {
            const tournamentsSnapshot = await getUserActiveTournaments(uid);
            tournamentsSnapshot.forEach(tournament => {
                tournaments.push(<SwissTournament> tournament.data())
            });
            res.status(200).send(tournaments);
            return;
        }
    } catch (error) {
        console.error(error);
        res.status(403).send({err : error});
        return;
    }
    res.status(403).send({err : 'Invalid Request'});
}

