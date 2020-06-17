import { Amount } from "../service/AccountService";

/**
 * Used to place bet on payments service
 */
export class BetDTO {
    public amount!: Amount;
    public partyA!: string;
    public partyB!: string;
}