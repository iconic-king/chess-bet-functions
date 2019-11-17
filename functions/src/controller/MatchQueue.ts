import * as admin from 'firebase-admin';
import { MatchRange, AccountService } from '../service/AccountService';
import { getMatchableFirestoreAccount, setUpMatch } from '../repository/MatchRepository';
import { updateAccount } from '../repository/UserRepository';
const Queue = require("firebase-queue");
const queueRef = admin.database().ref('queue');


const matchCreationOption = {
    specId: 'spec_1',
    sanitize: false,
    error_details: 'failed to create match'
}

/**
 * Not to be used in production env
 */
export function addSpecs() {
    const spec_1 = {
        in_progress_state: "matchable_account_creation_in_progress",
        finished_state: "matchable_account_creation_finished",
    }
    queueRef.child("specs/spec_1").set(spec_1).then(() => {
        console.log("spec_1_sent");
        
    }).catch(error => {
        console.log(error);
    });
}


export function createMatchQueue() {
    console.log("Match Queue Created");
     new Queue(queueRef, matchCreationOption, (data, progress,resolve,reject) => {
        console.log(data);
        const task: ReturnedMatchTask = <ReturnedMatchTask> data;
        let matchableAccount:AccountService;
                  
        // Test Purposes
        getMatchableFirestoreAccount(task.matcher, task.match_range).then(result => {
            const accounts = <Array<AccountService>> result;
            // tslint:disable-next-line: prefer-for-of
            console.log("Matcher", task.matcher);
            console.log("Accounts", accounts);
            
            for (const account of accounts) {
                if((account.elo_rating >= (task.matcher.elo_rating - task.match_range.start_at)) &&  (account.elo_rating <= (task.matcher.elo_rating + task.match_range.end_at) && (task.matcher.owner !== account.owner))){
                    matchableAccount = account;
                    break;
                }     
            }
            // A candidate has been found
            if(matchableAccount !== undefined){
                setUpMatch(matchableAccount.owner,task.matcher.owner, task.matcher.last_match_type, () =>  {
                    task.matcher.matched = true;
                    matchableAccount.matched = true;
                    updateAccount(task.matcher).then(() => {
                        updateAccount(matchableAccount).then(()=> {
                            removeTask(task._id).then(()=>{
                                resolve(task);
                            }).catch(error => {
                                 reject(error);
                            });
                        }).catch(error => {
                            console.log(error);
                            reject(task);
                        });
                    }).catch(error => {
                       console.error(error);
                       reject(task);                                    
                    })

                });
            } else {
                removeTask(task._id).then(()=>{
                    reject(task);
                }).catch(error => {
                     reject(error);
                });
            }
        }).catch(error => {
            console.error(error);
            reject(task);   
        })
    });
}


export function addTaskToQueue(matchTask: MatchTask, callback) {
    queueRef.child("tasks").push(matchTask).then(() => {
        callback(0)
    }).catch(error => {
        callback(1)
        console.log(error);
    });
}


export function removeTask(id:string) {
    return queueRef.child("tasks").child(id).remove();
}


export interface MatchTask {
    match_range : MatchRange;
    matcher: AccountService;
}

export interface ReturnedMatchTask extends MatchTask {
    _id: string;
}
