// Returned to client on verification request
export interface TwiloVerificationService {
    sid: string;
    friendly_name: string;
    service_sid: string;
    account_sid: string;
    status: string;
    valid: boolean;
}

export class TwiloVerificationDTO {
    phoneNumber!: string;
    channel!: string;
}

export class TwiloVerificationCode {
    phoneNumber!: string;
    code!: string;
}