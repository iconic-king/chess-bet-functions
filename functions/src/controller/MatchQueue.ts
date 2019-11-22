import * as admin from 'firebase-admin';
import { MatchRange, AccountService } from '../service/AccountService';
const queueRef = admin.database().ref('queue');
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
