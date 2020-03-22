export interface FCMMessageService{
    message: string
    registrationTokens: Array<string>
    from: string;
    fromUID: string;
    messageType: FCMMessageType
    data: string;
}


export enum FCMMessageType{
    "CHALLENGE",
    "INFORMATION",
    "CHAT"
}