import { Amount } from "../service/AccountService";

export class PayoutDTO{
    public amount!: Amount;
    public phoneNumber!: string;
}