export interface FCMMessageService{
    message: string
    registrationTokens: Array<string>
    from: string;
    fromUID: string;
    messageType: FCMMessageType
    data: string;
}


export enum FCMMessageType{
    NEW_CHALLENGE = "NEW_CHALLENGE",
    ACCEPT_CHALLENGE = "ACCEPT_CHALLENGE",
    INFORMATION = "INFORMATION",
    CHAT =  "CHAT",
    TARGET_CHALLENGE = 'TARGET_CHALLENGE'
}