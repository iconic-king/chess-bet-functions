import * as admin from 'firebase-admin';
import { AssignmentResult } from '../domain/Assignment';

const firestoreDatabase = admin.firestore();

/**
 * Adds assignmentResult from client
 * @param assignmentResult
 */
export const addAssigmentResult = (assignmentResult: AssignmentResult) => {
    assignmentResult.id = firestoreDatabase.collection('club_assignment_results').doc().id;
    return firestoreDatabase.collection('club_assignment_results').doc(assignmentResult.id).set(assignmentResult);
}

export const getAssignmentGroup =  (assignmentResult: AssignmentResult) => {
    return firestoreDatabase.collection('club_assignment_groups').doc(assignmentResult.groupId).get();
}

export const updateAssignmentResult = (assignmentResult: AssignmentResult) => {
    return firestoreDatabase.doc(`club_assignment_result/${assignmentResult.id}`).update(assignmentResult);
}