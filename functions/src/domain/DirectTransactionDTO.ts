import { Amount } from "../service/AccountService";

export class DirectTransactionDTO {
    public accountId!: number;
    public amount!: Amount;
}