const tournament_rs_queue = "schedule-tournament-rounds";
const { CloudTasksClient } = require('@google-cloud/tasks');
const functions = require('firebase-functions');

const project = JSON.parse(process.env.FIREBASE_CONFIG!).projectId
const location = 'us-central1'

const taskClient = new CloudTasksClient();
const tournament_rs_queue_path= taskClient.queuePath(project, location, tournament_rs_queue);

// Create Cloud Tasks To Handle data TTL
export class TasksApi {
    static async createTournamentRoundSchedulingTask (tournamentId: string, timeRoRun: number) {
        // Task to be run on cloud tasks
        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url: `${functions.config().tournament.callbackurl}?tournamentId=${tournamentId}`,
                body: Buffer.from(JSON.stringify({})).toString('base64'),
                headers: {
                    'Content-Type': 'application/json',
                }
            },
            scheduleTime: {
                seconds: timeRoRun
              }
        }
       const [response] =  await taskClient.createTask({parent: tournament_rs_queue_path, task});
       return response;
    }
}