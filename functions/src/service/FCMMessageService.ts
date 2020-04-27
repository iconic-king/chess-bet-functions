export interface FCMMessageService{
    message: string
    registrationTokens: Array<string>
    from: string;
    fromUID: string;
    messageType: FCMMessageType
    data: string;
}


export enum FCMMessageType{
    CHALLENGE = "CHALLENGE",
    INFORMATION = "INFORMATION",
    CHAT =  "CHAT",
    TARGET_CHALLENGE = 'TARGET_CHALLENGE'
}