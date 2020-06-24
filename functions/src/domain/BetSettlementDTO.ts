import { Amount } from "../service/AccountService";

export class BetSettlementDTO {
    public amount!: Amount;
    public partyA!: string;
    public partyB!: string;
    public draw!: string;
}