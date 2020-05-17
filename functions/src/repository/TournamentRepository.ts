/**
 * @author Collins Magondu 04/20/2020
 */
import * as admin from 'firebase-admin';
import { SwissTournament, PlayerSection, Tournament, Round, TournamentType } from '../domain/Tournament';
import { ParingAlgorithm } from '../domain/ParingAlgorithm';
import { MatchablePlayOnlineTournamentAccount, MatchedPlayOnlineAccount, MatchedPlayOnlineTournamentAccount } from '../service/AccountService';
import { MatchType } from '../domain/MatchType';
import { ParingOutput, Pair } from '../domain/ParingOutput';
import { createMatchedPlayTournamentAccount, createMatch } from './MatchRepository';
import { Alliance } from '../domain/Alliance';
import { DirectTransactionDTO } from '../domain/DirectTransactionDTO';
import { getServiceAccountByUserId } from './PaymentsRepository';
import { PaymentsApi } from '../api/PaymentsApi';
import { ProductAccount } from '../domain/ServiceAccount';

const firestoreDatabase = admin.firestore();
const realtimeDB = admin.database();

const tournamentCollection = "tournaments";
// tslint:disable-next-line: no-implicit-dependencies
import uuidv4 from 'uuid/v4';

const createMatchableAccountFromPlayer = (player: PlayerSection, tournamentDuration: number): MatchablePlayOnlineTournamentAccount | null => {
    if(player.uid && player.email) {
       const matchableAccount = new MatchablePlayOnlineTournamentAccount(player.uid, true, false, 0, MatchType.PLAY_ONLINE, false, tournamentDuration)
       matchableAccount.email = player.email;
       matchableAccount.duration = tournamentDuration;
       matchableAccount.tournamentId = player.tournamentId;
       matchableAccount.timeStamp = new Date().getTime();
       return matchableAccount;
    }
    return null;
}

export const createMatchAbleAccountsForPlayers = async (players: Array<PlayerSection>, duration: number) => {
    const map =  {};
    try {
        if(!players) {
            return null;
        }
        for (const player of players) {
            const matchable = createMatchableAccountFromPlayer(player, duration);
            if(player.uid && matchable){
                map[player.uid]  = matchable;
            } else {
                return null;
            }
        }
        // Matchables created successfully
        console.log(map);
        await realtimeDB.ref().child('matchables').set(map);
    } catch(error) {
        console.error(error);
    }
    return map;
}

export const  createSwissTournament = async (tournament :SwissTournament) => {
    tournament.id = firestoreDatabase.collection(tournamentCollection).doc().id
    tournament.timeStamp = new Date().getTime();
    tournament.dateOfStart = new Date().toLocaleDateString();
    tournament.matchDuration = (tournament.matchDuration) ? tournament.matchDuration : 5;
    let index = 1;
    for(const player of tournament.players) {
        player.tournamentId = tournament.id
        player.rankNumber = index;
        if(!player.uid || !player.email) {
            return null;
        }
        index++;
    }

    if(tournament.players && tournament.players.length > 0) {
        // Set Player Matchable accounts used for matching
        await createMatchAbleAccountsForPlayers(tournament.players, tournament.matchDuration);
    }
    return firestoreDatabase.collection(tournamentCollection).doc(tournament.id).set(tournament);
}

/**
 * Add tournament to players and assigns rankNumbers to the players
 * @param tournamentId
 * @param players
 */
export const addPlayersToTournament = async (tournamentId: string ,players: Array<PlayerSection>) => {
    const tournamentRef = await firestoreDatabase.collection(tournamentCollection).doc(tournamentId).get();
    return firestoreDatabase.runTransaction(async (_transaction) => {
        try {
            if(tournamentRef.exists) {
                const tournament = <Tournament> tournamentRef.data();
                // No Player Should Be Added if no data is provided.
                if(tournament.isLocked) {
                    return  null;
                }
                if(tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
                    const swissTournament = <SwissTournament> tournamentRef.data();
                    if (!swissTournament.players) {
                        swissTournament.players = new Array();
                        swissTournament.playersUID = new Array();
                    }
                    let counter = swissTournament.players.length + 1; // Rank Counter
    
                    for(const player of players) {
                        if(swissTournament.players.filter(result => result.uid === player.uid).length === 0) {
                            if(player.uid && player.email) {
                                player.rankNumber = counter;
                                player.tournamentId = swissTournament.id;
                                player.isActive = true;
                                swissTournament.playersUID.push(player.uid);
                                swissTournament.players.push(player);
                                counter++;
                            } else {
                                return null;
                            }
                        } else {
                            // Non unique player data
                            return null;
                        }
                    }
                    _transaction.update(tournamentRef.ref, swissTournament);
                    return swissTournament;
                }
            }
        } catch(error) {
            console.error(error);
        }
        return null;
    });
}

export const addPlayerToTournament = async (tournamentId: string ,player: PlayerSection) => {
    const tournamentRef = await firestoreDatabase.collection(tournamentCollection).doc(tournamentId).get();
    return firestoreDatabase.runTransaction(async (_transaction) => {
        try {
            if(tournamentRef.exists) {
                const tournament = <Tournament> tournamentRef.data();
                // No Player Should Be Added if no data is provided.
                if(tournament.isLocked) {
                    return  null;
                }
                if(tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
                    const swissTournament = <SwissTournament> tournamentRef.data();
                    if (!swissTournament.players) {
                        swissTournament.players = new Array();
                    }
                    player.rankNumber = swissTournament.players.length + 1;
                    player.tournamentId = swissTournament.id;
                    player.isActive = true;

                    if (swissTournament.typeOfTournament === TournamentType.PAID) {
                        
                        // PAID TOURNAMENT EXTRA LOGIC
                        const account = await getServiceAccountByUserId(player.uid);

                        if(!account) {
                            throw new Error('No Account Found For User');
                        }

                        const transaction = new DirectTransactionDTO();
                        transaction.accountId = account.accountId;
                        transaction.amount = swissTournament.amount;
                        transaction.ref = uuidv4();
                        const productAccount = <ProductAccount> await PaymentsApi.makeDirectTransaction(transaction);
                        console.log(productAccount);
                        if(productAccount.id){
                            console.log(productAccount);
                            swissTournament.players.push(player);
                        } else {
                            throw new Error('User has inssuficient funds');
                        }
                    } else {
                        swissTournament.players.push(player);
                    }
                    _transaction.update(tournamentRef.ref, swissTournament);
                    return swissTournament;
                }
            }
        } catch(error) {
            console.error(error);
        }
        return null;
    });
}

// Invoked During Tournament Creation
export const createMatchableAccountsFromTournament = async (tournament: Tournament) => {
    let map = {}
    if(tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
        const swissTournament = <SwissTournament>  tournament;
        const accountsMap = await createMatchAbleAccountsForPlayers(swissTournament.players, swissTournament.matchDuration);
        if(accountsMap) {
            map = accountsMap;
        }
    }
    return map;
}

// Gets tournament Id
export const getTournamentByID = async (id: string) => {
    const snapshot = await firestoreDatabase.collection(tournamentCollection).doc(id).get();
    const tournament = (snapshot.exists) ? <Tournament> snapshot.data() : null;
    if(tournament){
        switch (tournament.paringAlgorithm) {
            case ParingAlgorithm.SWISS:
                return <SwissTournament> snapshot.data();
        }
    }

    return null;
}

// Updates Whole Tournament Id
export const updateTournament = async (tournament: Tournament) => {
    if(tournament.id) {
        try {
            await firestoreDatabase.collection(tournamentCollection).doc(tournament.id).set(tournament);
        } catch(error) {
            console.log(error);
        }
        return tournament;
    }
    return null;
}

function createMatchedSwissAccountFromPair(pair: Pair, tournament: SwissTournament, matchId: string): Array<MatchedPlayOnlineAccount>{
    const accounts = new Array<MatchedPlayOnlineTournamentAccount>();
    if(pair.whitePlayer && pair.blackPlayer) {
        const white = createMatchedPlayTournamentAccount(tournament.players[pair.whitePlayer - 1],
            tournament.players[pair.blackPlayer - 1], matchId, tournament.matchDuration, Alliance.WHITE, tournament);
        const black = createMatchedPlayTournamentAccount(tournament.players[pair.blackPlayer - 1],
            tournament.players[pair.whitePlayer - 1], matchId, tournament.matchDuration, Alliance.BLACK, tournament);            
        if(white && black) {
            accounts.push(white, black);
        }
    }
    return accounts;
}

export const matchOnSwissParings = (paringOutput: ParingOutput, tournament: SwissTournament) => {
    let isMatchMade = false;
    const map = {
        tournament_matchables: {},
        tournament_matches: {}
    }
    console.log(`${tournament.id}  has ${paringOutput.pairs} for round ${tournament.numbeOfRoundsScheduled}`);
    for(const pair of paringOutput.pairs) {
        try {
        /// We have an odd number of players
        if(pair.blackPlayer === 0 && pair.whitePlayer) {
            const round:  Round = {
                playerNumber : '0000',
                scheduledColor: Alliance.NOALLIANCE,
                result: 'Z',
                matchUrl: ''
            }
            tournament.players[pair.whitePlayer - 1].rounds.push(round);
        } else if (pair.blackPlayer && pair.whitePlayer) {
            const blackPlayerIndex = pair.blackPlayer - 1;
            const whitePlayerIndex = pair.whitePlayer - 1;
            const match = createMatch(tournament.players[blackPlayerIndex].uid, tournament.players[whitePlayerIndex].uid, MatchType.PLAY_ONLINE);
            const matchId = tournament.players[whitePlayerIndex].uid.concat(tournament.players[blackPlayerIndex].uid);
            map.tournament_matches[matchId] = match;
            const accounts = createMatchedSwissAccountFromPair (pair, tournament, matchId);
            if(accounts.length  !== 2) {
                throw new Error("Accounts Must Be Two");
            }
            for(const account of accounts) {
                    map.tournament_matchables[account.owner] = account;
            }
            const playerOneRound :Round = {
                playerNumber : tournament.players[whitePlayerIndex].rankNumber.toString(),
                scheduledColor: Alliance.BLACK,
                result: '0',
                matchUrl: ''
            }

            const playerOneTwo :Round = {
                playerNumber : tournament.players[blackPlayerIndex].rankNumber.toString(),
                scheduledColor: Alliance.WHITE,
                result: '0',
                matchUrl: ''
            }
            tournament.players[blackPlayerIndex].rounds.push(playerOneRound);
            tournament.players[whitePlayerIndex].rounds.push(playerOneTwo);
            isMatchMade = true;
            }
        } catch (error) {
            console.error(error);
        }
    }
    if(isMatchMade) {
        if(tournament.numbeOfRoundsScheduled) {
            tournament.numbeOfRoundsScheduled++;
        } else {
            tournament.numbeOfRoundsScheduled = 1;
        }
        return map;
    } else {
        throw new Error("Map Has Not Been Found");
    }
}

export const updateObject = async (object: any) => {
    await realtimeDB.ref().update(object);
    return object;
}

function updatePlayerRound(player: PlayerSection, round: Round){
    if(round.result === 'W' || round.result === '1' || round.result === '+') {
        player.points = (player.points) ? player.points + 1 :  1;
    } else if  (round.result === 'D' || round.result === '=') {
        player.points = (player.points) ? player.points + 0.5 :  0.5;
    }
    const size = player.rounds.length;
    player.rounds[size -1].matchUrl = round.matchUrl;
    player.rounds[size -1].result = round.result;
} 

/**
 * Runs Transaction to updated player rounds
 * @param tournamentId 
 * @param playerRankOne 
 * @param roundOne 
 * @param playerRankTwo 
 * @param roundTwo 
 */
export const updatePlayerRounds = (tournamentId: string, playerRankOne: number, roundOne: Round, playerRankTwo: number, roundTwo: Round) => {
    const ref = firestoreDatabase.collection(tournamentCollection).doc(tournamentId);
    return firestoreDatabase.runTransaction(async transaction => {
        const doc = await transaction.get(ref);
        if (doc.exists) {
            const tournament = <Tournament> doc.data();
            if(tournament.paringAlgorithm === ParingAlgorithm.SWISS) {
                let isUpdated  = false;
                const swiss = <SwissTournament> doc.data();
                const playerOne = swiss.players[playerRankOne - 1];
                // Rounds Are Not Updated Yet
                if(playerOne.rounds.length === tournament.numbeOfRoundsScheduled) {
                    updatePlayerRound(playerOne, roundOne);
                    isUpdated = true;
                }
                isUpdated = false;
                const playerTwo = swiss.players[playerRankTwo - 1];
                // Rounds Are Not Updated Yet
                if(playerTwo.rounds.length === tournament.numbeOfRoundsScheduled) {
                    updatePlayerRound(playerTwo, roundTwo);
                    isUpdated = true;
                }
                
                // Should Be Updated
                if(isUpdated) {
                    transaction.update(ref, swiss);
                    return swiss;
                }
            }
        } 
        throw new Error(`Tounament ${tournamentId} No Update Took Place`);
    });
}


export const setTournamentPlayerIsActive = async (playerUID: string, tournamentId: string, isActive: boolean) => {
    const tournament = await getTournamentByID(tournamentId);
    if(tournament) {
        tournament.players.forEach(player => {
            if(player.uid === playerUID) {
                player.isActive = isActive; 
            }
        });
        return await updateTournament(tournament);
    }
    throw new Error('Tournament Not Found');
}

export const setTournamentLockedState = async (tournamentId: string, isLocked: boolean) => {
    const tournament = await getTournamentByID(tournamentId);
    if(tournament) {
        tournament.isLocked = isLocked;
        return await updateTournament(tournament);
    }
    throw new Error('Tournament Not Found');
}

export const getUserActiveTournaments = async (userId: string) => {
    return firestoreDatabase.collection(tournamentCollection)
    .where('isLocked', '==', true)
    .where("playersUID", 'array-contains', userId).get();
}