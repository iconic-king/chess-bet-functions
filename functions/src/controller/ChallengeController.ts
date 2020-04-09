import { Response, Request } from 'firebase-functions';
import { ChallengeDTO, ChallengeResponse } from '../domain/Challenge';
import { getOrSetChallenge } from '../repository/ChallengeRepository';

export const onRandomChallengeRecieved = (req: Request, res: Response) => {
    const challengeDTO = <ChallengeDTO>  req.body;
    getOrSetChallenge(challengeDTO,  (response: ChallengeResponse)=> {
        res.status(200).send(response)
    }).then().catch(error=> {
        console.error(error);
        res.status(500).send(error);
    });
}