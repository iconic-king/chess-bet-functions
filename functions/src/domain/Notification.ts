export interface EmailMessage {
    from :string ;
    to: Array<string>;// Recepients
    subject: string,
    text: string;
}


export interface TournamentNotification {
    tournamentId: string;
    text: string,
    subject: string;
}