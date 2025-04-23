import type { TransactionType } from '../constants';

export interface SignedTransaction {
  serializedTransaction: Uint8Array;
  signatures: string[];
}

export interface Transaction {
  id: string;
  type: TransactionType;
  actions?: any;
  namedParams?: any;
  dapp?: string;
  result?: any;
  schema?: string;
}

export interface NamedParams {
  blocksBehind: number;
  expireSeconds: number;
}
