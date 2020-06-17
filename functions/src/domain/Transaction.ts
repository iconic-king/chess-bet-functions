export enum TransactionType{
    TRANSACTION_DEBIT = 'TRANSACTION_DEBIT',
    TRANSACTION_CREDIT = 'TRANSACTION_CREDIT',
    PREMIUM_CREDIT = 'PREMIUM_CREDIT',
    HOLDING = 'HOLDING',
    BET_ONLINE = 'BET_ONLINE',
}

export interface Transaction {
    ref?: string,
    amount: number,
    transactionType: TransactionType,
    name: string,
    creditAccountId: number;
    debitAccountId: number | null;
}