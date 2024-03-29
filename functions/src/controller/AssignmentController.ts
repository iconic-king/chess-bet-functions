import { Response, Request } from 'firebase-functions';
import { AssignmentResult, AssignmentGroup } from '../domain/Assignment';
import { getAssignmentGroup, addAssigmentResult } from '../repository/AssignmentRepository';

/**
 * Changes made on file (AssignmentController.ts)
 * -> replaced .then callbacks with async await
 */

export const markAssignmentImplementation = async (req: Request, res: Response)  => {
    const assignmentResult = <AssignmentResult> req.body;

    try {
        await markAssignment(assignmentResult);
        res.status(200).send(assignmentResult);
    } catch(error){
        res.status(403).send(error);
    }
}

async function markAssignment(assignmentResult: AssignmentResult) {
    let points: number = 0;
    const result = await getAssignmentGroup(assignmentResult);
    const assignmentGroup = <AssignmentGroup> result.data();
    assignmentResult.group = assignmentGroup;
    assignmentResult.questions.forEach(question => {
        if (question.hasPuzzle && !question.puzzle.isReadOnly) {
            if (question.puzzle.solved) {
                points = points +  parseInt(question.points.toString());
            }
        } else  {
            if(question.choice === question.answer) {
                points = points +  parseInt(question.points.toString());
            }
        }
    });
    assignmentResult.points = points;
    await addAssigmentResult(assignmentResult);
}  