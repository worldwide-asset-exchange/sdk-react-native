export const RPC_METHODS = {
  WAX_REQUEST_ACCOUNT: 'wax_request_account',
  WAX_GET_REQUIRED_KEYS: 'wax_get_required_keys',

  /**
   * @brief Get public keys associated with the account, corresponding to the private keys held by the wallet.
   *
   * @param account - {string} - Public keys associated with the account.
   * @param chainId - {string} - Chain ID with the account.
   *
   * @return public_keys - {string[]} - Public keys associated with the private keys that the wallet holds.
   */
  WAX_GET_AVAILABLE_KEYS: 'wax_get_available_keys',

  /**
   * @brief Sign a message with the private keys specified via their public keys.
   *
   * @param required_keys - {string[]} - Public keys associated with the private keys needed to sign the transaction.
   * @param message - {any(Optional)} - Message to sign.
   *
   * @return signatures - {string[]} - Array of signatures required to authorize transaction.
   */
  WAX_SIGN_MESSAGE: 'wax_sign_message',

  /**
   * @brief Sign a transaction with the private keys specified via their public keys.
   *
   * @param chain_id - string - A hexadecimal string representing the chain ID of the network.
   * @param required_keys - string[] - Public keys associated with the private keys needed to sign the transaction.
   * @param serialized_transaction - Uint8[] - Array of Uint8 Transaction to sign.
   * @param serialized_context_free_data - Uint8[] - Context-free data to sign.
   * @param transaction (optional) - Object(Transaction).
   *
   * @return signatures - string[] - array of signatures required to authorize transaction.
   * @return serialized_transaction - Array of Uint8 Transaction to sign.
   * @return serialized_context_free_data - Context-free data to sign.
   */
  WAX_SIGN_TRANSACTION: 'wax_sign_transaction',

  /**
   * @brief Sign a transaction with the private keys specified via their public keys.
   *
   * @param chain_id - {string} - A hexadecimal string representing the chain ID of the network.
   * @param required_keys - {string[]} - Public keys associated with the private keys needed to sign the transaction.
   * @param serialized_transaction - {Uint8[]} - Array of Uint8 Transaction to sign.
   * @param serialized_context_free_data - {Uint8[](Optional)} - Context-free data to sign.
   * @param transaction - {Transaction(Optional)} - Object(Transaction).
   *
   * @return signatures - string[] - array of signatures required to authorize transaction.
   * @return serialized_transaction - Array of Uint8 Transaction to sign.
   * @return serialized_context_free_data - Context-free data to sign.
   * @return transaction_id - Transaction ID.
   */
  WAX_SIGN_PUSH_TRANSACTION: 'wax_sign_push_transaction',
  WAX_PUSH_TRANSACTION: 'wax_push_transaction',
};

export const METHODS_TO_REDIRECT: { [method: string]: boolean } = {
  [RPC_METHODS.WAX_REQUEST_ACCOUNT]: true,
  [RPC_METHODS.WAX_GET_AVAILABLE_KEYS]: true,
  [RPC_METHODS.WAX_PUSH_TRANSACTION]: false,
  [RPC_METHODS.WAX_SIGN_MESSAGE]: false,
  [RPC_METHODS.WAX_SIGN_TRANSACTION]: false,
  [RPC_METHODS.WAX_SIGN_PUSH_TRANSACTION]: true,
};
