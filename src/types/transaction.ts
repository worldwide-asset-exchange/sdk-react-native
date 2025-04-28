import type { TransactionType } from '../constants';

export interface SignedTransaction {
  serializedTransaction: Uint8Array;
  signatures: string[];
}

export interface SignatureResponse {
  signatures: string[];
  transaction: Transaction;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  actions?: any;
  namedParams?: any;
  dapp?: string;
  result?: any;
  schema?: string;
  timestamp ?: number;
}

export interface NamedParams {
  blocksBehind: number;
  expireSeconds: number;
}
