export enum ErrorMessages {
  // General
  Activation_GetRequisitionInfoFailed = 'Failed to get requisition information',

  // Activation
  Activation_Expired = 'Connection request expired',
  Activation_AlreadyActivated = 'Connection already activated',
  Activation_NotActivated = 'Connection not activated',
  Activation_Timeout = 'Connection request timed out',

  // Direct Connect
  DirectConnect_Cannot_Open_Wallet = 'Cannot open wallet application',
  DirectConnect_NotActivated = 'Direct connection not activated',
  DirectConnect_Unknown_Error = 'Unknown error during direct connection',
  DirectConnect_InvalidMetadata = 'Invalid application metadata for connection',

  // Transaction
  Transaction_InvalidActions = 'Invalid transaction actions',
  Transaction_NotAuthenticated = 'Authentication required for transaction',
  Transaction_PublishError = 'Failed to publish transaction request',
  Transaction_Timeout = 'Transaction request timed out',
  Transaction_Rejected = 'Transaction rejected by user',
  Transaction_Error = 'Error processing transaction',
  Transaction_SubscriptionError = 'Subscription error during transaction',
  Transaction_SetupError = 'Failed to set up transaction request',
  Transaction_Unknown_Error = 'Unknown error during transaction',
  Transaction_EncodingError = 'Failed to encode transaction data'
}
