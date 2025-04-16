export enum ConnectStatus {
  ACTIVATED = 'activated',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error',
}

export enum TransactionType {
  REQUESTING = 'requesting',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ERROR = 'error',
  READY = 'ready',
  NOT_READY = 'not-ready',
}
