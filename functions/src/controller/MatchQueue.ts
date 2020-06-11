import * as admin from 'firebase-admin';
import { MatchRange, AccountService } from '../service/AccountService';
import { matchesReference } from '../repository/MatchRepository';
import { MatchResult } from '../service/MatchService';
import { evaluateAndStoreMatch } from './MatchController';
import Queue from 'firebase-queue';
const tasks_node = "tasks";

const queueRef = admin.database().ref('evaluationQueue');

/**
 * Changes made on file (MatchQueue.ts)
 * -> replaced .then callbacks with async await
 */

/**
 * Create match queue foe match evaluation
 */
export function createMatchEvaluationQueue () {
    const options = {
        specId: 'spec_1',
        sanitize: false,
    }
    new Queue(queueRef ,options, async (data, progress,resolve,reject) => {
        const matchResult = <MatchResult> data;
        const result = await evaluateAndStoreMatch(matchResult);
        if(result) {
            resolve(matchResult);
        }else {
            reject({err: 'Error occured'});
        }
    });
    console.log("MATCH EVALUATION QUEUE CREATED");
}

export function createMatchDeletionQueue() {
    const options = {
        specId: 'spec_2',
        sanitize: false,
    }
    new Queue(queueRef ,options, async (data, progress,resolve,reject) => {
        const matchResult = <MatchResult> data;
        try {
            await matchesReference.child(matchResult.matchId).remove();
            await removeTask(matchResult._id);
            resolve();
        } catch(error) {
            reject();
        }
    });
    console.log("MATCH DELETION QUEUE CREATED");
}

/**
 * Not to be used in production env
 */
export async function addSpecs() {
    try {
        await queueRef.child("specs").set({
            spec_1 : {
                in_progress_state: "match_evaluation_in_progress",
                finished_state: "match_evaluation_finished"
            },
            spec_2 : {
                start_state : "match_evaluation_finished",
                in_progress_state: "match_deletion_in_progress",
                finished_state: "match_deletion_finished"
            }
        });
        console.log("specs_sent");
    } catch(error) {
        console.log(error);
    }
}

/**
 * To be deleted after successfull launch of version 1.2
 * @param matchTask 
 * @param callback 
 */
export async function addTaskToQueue(matchTask: MatchTask, callback) {
    try {
        await queueRef.child("tasks").push(matchTask);
        callback(0);
    } catch(error) {
        callback(1);
        console.log(error);
    }
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
