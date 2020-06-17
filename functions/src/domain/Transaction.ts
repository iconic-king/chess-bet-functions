import { TransactionType } from './TransactionType';

export interface TransactionDetails {
    phoneNumber: number;
    type: TransactionType;
}