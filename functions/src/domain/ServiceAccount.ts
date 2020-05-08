export class ServiceAccount {
    public name!: string;
    public serviceId!: string;  
    public accountId!: string;
    public owner!: string;
    public phoneNumber!: string;
    public email!: string
}

export interface PaymentsApiAccountDTO {
    userId: string,
	email:  string,
	name: string,
	phoneNumber: number,
	serviceId: number
}