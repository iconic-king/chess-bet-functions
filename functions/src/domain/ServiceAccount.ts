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
    CREATED = 'CREATED',
    SUSPENDED = 'SUSPENDED',
    PAID_PREMIUM = 'PAID_PREMIUM',
    TERMS_OF_SERVICE_ACCEPTED = 'TERMS_OF_SERVICE_ACCEPTED',
    ACTIVATED = 'ACTIVATED'
}

/**
 * Structure data from payments
 */
export interface ProductAccount {
    id: number;
    userId: string,
	email:  string,
	name: string,
	phoneNumber: string,
    serviceId: number,
    balance: number;
    termsOfServiceAccepted : boolean;
    status: Status;
}