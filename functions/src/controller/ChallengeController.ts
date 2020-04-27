import { Response, Request } from 'firebase-functions';
import { ChallengeDTO, ChallengeResponse, TargetedChallenge } from '../domain/Challenge';
import { getOrSetChallenge, createTargetedChallenge } from '../repository/ChallengeRepository';

export const onRandomChallengeRecieved = (req: Request, res: Response) => {
    const challengeDTO = <ChallengeDTO>  req.body;
    getOrSetChallenge(challengeDTO,  (response: ChallengeResponse)=> {
        res.status(200).send(response)
    }).then().catch(error=> {
        console.error(error);
        res.status(500).send(error);
    });
}

export const onTargetedChallengeReceived = (req: Request, res: Response) => {
    const targetedChallenge = <TargetedChallenge> req.body;
    if(targetedChallenge.owner && targetedChallenge.target){
        createTargetedChallenge(targetedChallenge).then((response) => {
            res.status(200).send(response);
        }).catch(error => {
            res.status(403).send({err : error});
        });
    }
}