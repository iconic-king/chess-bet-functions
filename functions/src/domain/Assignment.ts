export enum Type {
    MULTICHOICE = 'MULTICHOICE',
    OPEN_ENDED = 'OPEN_ENDED'
}

export enum AssignmentType {
    CLUB = 'CLUB',
    PRODUCT = 'PRODUCT'
}

export interface PuzzleMove {
    name: string;
    toCoordinate: number;
    fromCoordinate: number;
}

export interface PuzzleQuestion {
    fen: string;
    moves: Array<PuzzleMove>;
    solved: boolean;
}

export interface Question {
    no: number;
    type: Type;
    points: number;
    correct: boolean;
    imageURI: string;
    question: string;
    choices: Array<Choice>;
    answer: string;
    choice: string;
    description: string;
    hasPuzzle: boolean;
    puzzle: PuzzleQuestion;
}

export interface Choice {
   letter: string;
   choice: string;
}

export interface AssignmentGroup {
   id: string;
   name: string;
   clubId: string;
}

export interface Assignment {
     id: string;
     title: string;
     description: string;
     clubId: string;
     assigneeUID: string;
     points: string;
     dateCreated: string;
     authorName: string;
     authorUID: string;
     groupID: string;
     type: AssignmentType;
     questions: Array<Question>;
     isTargeted: boolean;
     isAutoMarked: boolean;
}

/**
 *  Will be sent to the server
 */
export interface AssignmentResult {
    name: string;
    groupId: string;
    group: AssignmentGroup;
    id: string;
    uid: string;
    clubId: string;
    assgnmentName: string;
    assignmentId: string;
    questions: Array<Question>;
    assignmentType: AssignmentType;
    points: number;
}
