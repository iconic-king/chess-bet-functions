/**
 * @author Collins Magondu
 */
/**
 * Changes made on file (MatchController.ts)
 * -> replaced .then callbacks with async await
 */
import { Response, Request } from 'firebase-functions';
import { AccountService ,MatchService, MatchDetailsService, MatchableAccount} from '../service/AccountService';

import { setMatchableAccount,getMatch, removeMatch, removeMatchable} from '../repository/MatchRepository';
import { getUserAccount, updateAccount} from "../repository/UserRepository";
import { MatchResult, MatchStatus } from '../service/MatchService';
import { MatchEvaluationResponse } from '../domain/MatchEvaluationResponse';
import { getServiceAccountByUserId } from '../repository/PaymentsRepository';
import { MatchType } from '../domain/MatchType';
import { BetSettlementDTO } from '../domain/BetSettlementDTO';
import { PaymentsApi } from '../api/PaymentsApi';

export const createMatchabableAccountImplementation = async (res : Response, req: Request) => {
    const matchableAccount = <MatchableAccount> req.body; // JSON  MATCHABLE OBJECT
    try {
        await setMatchableAccount(matchableAccount);
        // Return the account
        res.status(200).send(matchableAccount) // Ready to match
    } catch(error) {
        // TODO respond with relevant error
        console.log(error.message);
    }
} 

function expectedScore (rating: number, opponent_rating:number) : number {
    return 1 / (1 + (Math.pow(10, (opponent_rating - rating)/ 400)));
}

function newRating (expected_score: number, score: number, rating: number){
    console.log(expected_score);
    console.log(rating);
    console.log(score);
    
    return rating + (32 * (score - expected_score));
}

function updateAccountEloRating( account:AccountService,opponent_rating:number, matchResult:MatchResult) : number {
    if (matchResult.matchStatus === MatchStatus.DRAW || matchResult.matchStatus === MatchStatus.GAME_ABORTED) {
        // Draw
        account.elo_rating = newRating(expectedScore(account.elo_rating, opponent_rating), 0.5 , account.elo_rating);
    } else  if(account.owner === matchResult.gain) {
        // Won
        account.elo_rating = newRating(expectedScore(account.elo_rating, opponent_rating), 1.0, account.elo_rating);
    }
    else if(account.owner === matchResult.loss){
        // Lost
        account.elo_rating = newRating(expectedScore(account.elo_rating,opponent_rating), 0 , account.elo_rating);
    }
    account.elo_rating = Math.round(account.elo_rating);
    return account.elo_rating;
}

/** Decides player rating on player uid */
function decidePlayerRating (account_one:AccountService , account_two:AccountService, uid:string) : number {
  return account_one.owner === uid ? account_one.elo_rating : account_two.elo_rating;
}

/* Ensures points taken from one player are given to another no floating points left*/
function tradePoints(pointsBefore: number, pointsAfter:number){
    return pointsAfter - pointsBefore;
}

/**
 * Ensures points are taken from loser to winner and not derived from winning user (Algorithm Supports This)
 * @param account_one 
 * @param account_two 
 * @param matchResult 
 */
function exchangePoints(account_one: AccountService, account_two :AccountService, matchResult: MatchResult){
    const account_one_elo = account_one.elo_rating;
    account_one.elo_rating = updateAccountEloRating(account_one, account_two.elo_rating, matchResult);
    const newPoints = tradePoints(account_one_elo, account_one.elo_rating);
    if(newPoints >= 0) {
       account_two.elo_rating -= newPoints;   
    } else {
       account_two.elo_rating += (newPoints *  -1) // Ensure accounts do not have negative values
    }
}

/**
 * Saves Matches In DB and evaluates bets
 * @param matchResult
 */
export const evaluateAndStoreMatch = async (matchResult: MatchResult) => {
    try {
        let account_one:AccountService;
        let account_two:AccountService;
        const accountOneSnapshot =  await getUserAccount(matchResult.gain).get();
        account_one  = <AccountService> accountOneSnapshot.docs[0].data();
        const accountTwoSnapshot =  await getUserAccount(matchResult.loss).get();
        account_two  = <AccountService> accountTwoSnapshot.docs[0].data();
        exchangePoints(account_one, account_two, matchResult);

        const matchSnaphot = await getMatch(matchResult.matchId);
        if(matchSnaphot.exists()) {
            const match = <MatchService> matchSnaphot.val();
            // Bet Settlement
            if(match.match_type === MatchType.BET_ONLINE) {
                /*
                * Set the actual bet amount
                * Client should pass the bet amount they placed and server should mutiply that by 2
                */
                if(matchResult.amount) {
                    matchResult.amount.amount = matchResult.amount.amount * 2;
                }
                const gainAccount = await getServiceAccountByUserId(matchResult.gain);
                const lossAccount = await getServiceAccountByUserId(matchResult.loss);

                let betSettleMentDTO : BetSettlementDTO;
                if(gainAccount && lossAccount) {
                    if (matchResult.matchStatus === MatchStatus.DRAW || matchResult.matchStatus === MatchStatus.GAME_ABORTED) {
                        betSettleMentDTO = <BetSettlementDTO> {
                            amount : matchResult.amount,
                            partyA: gainAccount.phoneNumber,
                            partyB: lossAccount.phoneNumber,
                            draw: "DRAW"
                        }
                    } else{
                        betSettleMentDTO = <BetSettlementDTO> {
                            amount : matchResult.amount,
                            partyA: gainAccount.phoneNumber
                        }
                    }
                    console.log(betSettleMentDTO);
                    await PaymentsApi.settleBet(betSettleMentDTO);
                } else {
                    console.error('Service Accounts Not Found');
                    return null;
                }
            }
            const match_details: MatchDetailsService = {
                amount: matchResult.amount,
                dateCreated: new Date().toLocaleString(),
                match_result : matchResult,
                match_type : match.match_type,
                players : [
                    {
                        owner : match.players.BLACK.owner,
                        elo_rating : decidePlayerRating(account_one,account_two,match.players.BLACK.owner),
                        events : match.players.BLACK.events ? match.players.BLACK.events : [],
                        type : 'BLACK'
                    },
                    {
                        owner : match.players.WHITE.owner,
                        elo_rating : decidePlayerRating(account_one,account_two,match.players.WHITE.owner),
                        events : match.players.WHITE.events ? match.players.WHITE.events : [],
                        type : 'WHITE'
                    }
                ],
                matchPgn: matchResult.pgnText
            }
            if(account_one.matches === undefined){
                account_one.matches = new Array<MatchDetailsService>();
            }
            if(account_two.matches === undefined) {
                account_two.matches = new Array<MatchDetailsService>();
            }
            account_one.matches.push(match_details);
            account_two.matches.push(match_details); 
    
            // Run transaction
            await updateAccount(account_one);
            await updateAccount(account_two);
            await removeMatchable(account_one.owner);
            await removeMatchable(account_two.owner);
            await removeMatch(matchResult.matchId);
    
            return <MatchEvaluationResponse> {
                ownerOne : account_one.owner,
                ownerTwo: account_two.owner,
                ownerOneElo : account_one.elo_rating,
                ownerTwoElo : account_two.elo_rating
            }
        }
    } catch (error) {
        console.error(error);
        return null;
    }
    return null;
}

/**
 * @deprecated
 * @param req 
 * @param res 
 */
export const forceEvaluateMatch = async (req,res) => {
    const matchId = req.body;

    try {
        const snapshot = await getMatch(matchId);
        if(snapshot.exists()){
        const match = <MatchService> snapshot.val();
        const gain = (match.players.WHITE.gameTimeLeft > match.players.WHITE.gameTimeLeft) 
        ? match.players.WHITE.owner : match.players.BLACK.owner; 
        const loss = (match.players.WHITE.gameTimeLeft > match.players.WHITE.gameTimeLeft) 
        ? match.players.BLACK.owner : match.players.WHITE.owner; 
    
        const matchResult: MatchResult = {
          gainName: gain,
          lossName: loss,
          pgnText : match.players.WHITE.pgn,   
          matchId : snapshot.key || '',
          matchStatus: MatchStatus.ABANDONMENT,
          amount: null,
          matchType: match.match_type,
          gain: gain,
          loss: loss,
          _id: snapshot.key || ''
        }
        // tslint:disable-next-line: no-floating-promises
        await evaluateAndStoreMatch(matchResult); 
        res.status(200).send();
        }
    } catch(error) {
        console.error(error);
        res.status(403).send();
    }
}