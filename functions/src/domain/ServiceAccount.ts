export class ServiceAccount {
    public id!: string;
    public name!: string;
    public accountId!: number;
    public userId!: string;
    public phoneNumber!: string;
    public email!: string;
}

export interface ServiceAccountDTO {
    userId: string,
	email:  string,
	name: string,
	phoneNumber: string,
	serviceId: number
}

export enum Status {
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    PENDING = 'PENDING',
    CLOSED = 'CLOSED'
}

/**
 * Structure data from payments
 */
export interface PaymentAccount {
    id: number;
    userId: string,
	email:  string,
	name: string,
	phoneNumber: string,
    balance: number;
    termsOfServiceAccepted : boolean;
    status: Status;
}