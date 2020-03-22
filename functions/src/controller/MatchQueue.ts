import * as admin from 'firebase-admin';
import { MatchRange, AccountService } from '../service/AccountService';
import { matchesReference } from '../repository/MatchRepository';
import { MatchResult } from '../service/MatchService';
import { evaluateAndStoreMatch } from './MatchController';
import Queue from 'firebase-queue';
const tasks_node = "tasks";

const queueRef = admin.database().ref('evaluationQueue');

/**
 * Create match queue foe match evaluation
 */
export function createMatchEvaluationQueue () {
    const options = {
        specId: 'spec_1',
        sanitize: false,
    }
    new Queue(queueRef ,options, (data, progress,resolve,reject) => {
        const matchResult = <MatchResult> data;
        evaluateAndStoreMatch(matchResult, ()=> {
            console.log("Data 10");
            resolve(matchResult);
        });
    });
    console.log("MATCH EVALUATION QUEUE CREATED");
}

export function createMatchDeletionQueue() {
    const options = {
        specId: 'spec_2',
        sanitize: false,
    }
    new Queue(queueRef ,options, (data, progress,resolve,reject) => {
        const matchResult = <MatchResult> data;
        matchesReference.child(matchResult.matchId).remove().then(()=>{
            removeTask(matchResult._id).then(()=>{
                resolve();
            }).catch(()=>{
                reject();
            })
            }).catch(()=> {
                reject();
            });
    });
    console.log("MATCH DELETION QUEUE CREATED");
}

/**
 * Not to be used in production env
 */
export function addSpecs() {
    queueRef.child("specs").set({
        spec_1 : {
            in_progress_state: "match_evaluation_in_progress",
            finished_state: "match_evaluation_finished"
        },
        spec_2 : {
            start_state : "match_evaluation_finished",
            in_progress_state: "match_deletion_in_progress",
            finished_state: "match_deletion_finished"
        }
    }).then(() => {
        console.log("specs_sent");
    }).catch(error => {
        console.log(error);
    });
}

/**
 * To be deleted after successfull launch of version 1.2
 * @param matchTask 
 * @param callback 
 */
export function addTaskToQueue(matchTask: MatchTask, callback) {
    queueRef.child("tasks").push(matchTask).then(() => {
        callback(0)
    }).catch(error => {
        callback(1)
        console.log(error);
    });
}


export function removeTask(id:string) {
    return queueRef.child(tasks_node).child(id).remove();
}


export interface MatchTask {
    match_range : MatchRange;
    matcher: AccountService;
}

export interface ReturnedMatchTask extends MatchTask {
    _id: string;
}
