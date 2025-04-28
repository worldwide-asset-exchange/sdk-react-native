import { ErrorMessages, TransactionType } from '@/constants';
import {
  INSTALL_APP_DEEPLINK_ANDROID,
  INSTALL_APP_DEEPLINK_IOS,
  WAX_SCHEME_DEEPLINK,
} from '@/constants/urls';
import type {
  LoginResponse,
  RequisitionInfo,
  Transaction,
  Subscribe2channelSubscription,
  DappMetadata,
  WaxDeeplinkProviderProps,
  UserData,
  NamedParams,
} from '../types';
import { Linking, Platform } from 'react-native';
import { API, Amplify, graphqlOperation } from 'aws-amplify';
import { GraphQLSubscription } from '@aws-amplify/api';
import { v4 as uuidv4 } from 'uuid';
import { publish2channel } from '@/utils/socket';

export class WaxDeeplinkSDK {
  private _activationEndpoint: string;
  private _clientId: string;
  private _pollingInterval: number;
  private _requisitionInfo?: RequisitionInfo;
  private _getSingleUseToken: () => Promise<string>;
  private _metadata: DappMetadata;

  constructor(params: WaxDeeplinkProviderProps) {
    this._activationEndpoint = params.activationEndpoint;
    this._clientId = params.clientId;
    this._pollingInterval = params.opts?.pollingInterval || 5000;
    this._getSingleUseToken = params.getSingleUseToken || (async () => '');
    this._metadata = params.metadata;

    const myAppConfig = {
      aws_appsync_graphqlEndpoint: params.relayEndpoint,
      aws_appsync_region: params.relayRegion,
      aws_appsync_authenticationType: 'AWS_LAMBDA',
    };
    Amplify.configure(myAppConfig);
  }

  /**
   * Generates QR code content for wallet connection with proper parameter handling.
   * Retrieves requisition info if needed and appends the nonce to create a secure connection request.
   *
   * @param nonce - A unique string to prevent replay attacks
   * @returns A Promise resolving to a properly formatted QR code content string
   */
  public async getQRCode(nonce: string): Promise<string> {
    console.log('getQRCode::', { nonce });

    try {
      // Get or reuse requisition info
      if (!this._requisitionInfo) {
        const requisitionInfo = await this._getRequisitionInfo();
        if (!requisitionInfo) {
          throw new Error(ErrorMessages.Activation_GetRequisitionInfoFailed);
        }
        this._requisitionInfo = requisitionInfo;
      }

      // Handle the requisition info case
      if (this._requisitionInfo) {
        let qrCodeContent = this._requisitionInfo.qrCodeContent;

        // Append nonce if provided
        if (nonce) {
          // Check if nonce already exists in the URL
          if (!qrCodeContent.includes(`nonce=`)) {
            qrCodeContent = `${qrCodeContent}&nonce=${encodeURIComponent(nonce)}`;
          }
          // Store nonce for later use
          this._requisitionInfo.nonce = nonce;
        }

        // Remove schema parameter if present to avoid duplication
        return qrCodeContent.replace(/&schema=[^&]+/, '');
      }

      // Fallback case - build URL from scratch with available metadata
      return this._buildFallbackQRContent(nonce);
    } catch (error) {
      console.error('[getQRcodeContent] Error:', error);
      return this._buildFallbackQRContent(nonce);
    }
  }

  /**
   * Creates a fallback QR code content string when requisition info is unavailable.
   *
   * @param nonce - A unique string to prevent replay attacks
   * @returns A properly formatted QR code content string
   * @private
   */
  private _buildFallbackQRContent(nonce: string): string {
    const params = new URLSearchParams();

    // Add required parameters with null checks
    params.append('code', this._requisitionInfo?.code || '');
    params.append('nonce', nonce || '');
    params.append('dapp', this._metadata.origin || '');
    params.append('schema', this._metadata.scheme || '');
    params.append('logourl', this._metadata.icon || '');
    params.append('origin', this._metadata.origin || '');
    params.append('description', this._metadata.description || '');
    params.append('antelope', 'antelope-1');

    return `${WAX_SCHEME_DEEPLINK}://request?${params.toString()}`;
  }

  /**
   * Deactivates the current dApp connection with the wallet.
   * Sends a request to the deactivation endpoint and resets connection state.
   *
   * @returns A Promise resolving to true if deactivation was successful, false otherwise
   */
  public async deactivate(): Promise<boolean> {
    try {
      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

      // Make deactivation request
      const response = await fetch(
        `${this._activationEndpoint}/dapp/deactivate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // Handle response
      if (!response.ok) {
        console.warn(`[deactivate] Failed with status: ${response.status}`);
        // Still clean up local state even if request fails
      }

      // Clean up connection state regardless of server response
      this._requisitionInfo = undefined;

      console.log('[deactivate] Connection deactivated successfully');
      return true;
    } catch (error) {
      console.error('[deactivate] Error:', error);

      // Clean up connection state even if there's an error
      this._requisitionInfo = undefined;

      // Still return true since local state was cleaned up
      return true;
    }
  }

  /**
   * Signs a transaction by sending it through the connected wallet.
   * This function publishes the transaction request to a channel and waits for user approval.
   *
   * @param actions - Array of actions to be executed in the transaction
   * @param namedParams - Named parameters for the transaction
   * @param user - User authentication info containing token and account
   * @returns A Promise resolving to the transaction result when approved
   * @throws Error if transaction is rejected, times out, or encounters an error
   */
  public async signTransaction(
    actions: any,
    namedParams: Record<string, any>,
    user: UserData
  ): Promise<Transaction> {
    // Validate required parameters
    if (!actions) {
      throw new Error(ErrorMessages.Transaction_InvalidActions);
    }

    if (!user?.account) {
      throw new Error(ErrorMessages.Transaction_NotAuthenticated);
    }

    const token = user.token;
    const channelName = `dapp:${this._metadata.origin}:${user.account}`;

    // Create transaction info object
    const txInfo: Transaction = {
      id: uuidv4(),
      type: TransactionType.REQUESTING,
      actions,
      namedParams: namedParams || {},
      dapp: this._metadata.origin || '',
      schema: this._metadata.scheme || '',
      timestamp: Date.now(),
    };

    console.log(
      `[signTransaction] Publishing transaction request ${txInfo.id}`,
      {
        channel: channelName,
        actionCount: actions,
      }
    );

    try {
      // Publish transaction to the channel
      await API.graphql(
        graphqlOperation(
          publish2channel,
          {
            name: channelName,
            data: JSON.stringify(txInfo),
          },
          JSON.stringify({
            account: user.account,
            token: token,
            svc: this._metadata.origin,
            mode: 'dapp',
          })
        )
      );
    } catch (error) {
      console.error('[signTransaction] Failed to publish transaction:', error);
      throw new Error(ErrorMessages.Transaction_PublishError);
    }

    return new Promise<Transaction>((resolve, reject) => {
      let subscription: any = null;
      let timeoutId: NodeJS.Timeout | null = null;

      // Function to clean up resources
      const cleanup = () => {
        if (subscription) {
          subscription.unsubscribe();
          subscription = null;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      try {
        // Set up timeout for transaction
        timeoutId = setTimeout(() => {
          console.warn(
            `[signTransaction] Transaction ${txInfo.id} timed out after 3 minutes`
          );
          cleanup();
          reject(new Error(ErrorMessages.Transaction_Timeout));
        }, 180000); // 3 minutes in milliseconds

        // GraphQL subscription query
        const query = `
        subscription Subscribe2channel($name: String!) {
          subscribe2channel(name: $name) {
            data
            name
            __typename
          }
        }
      `;

        // Set up subscription options
        const graphqlOption = graphqlOperation(
          query,
          {
            name: channelName,
          },
          JSON.stringify({
            account: user.account,
            token: user.token,
            svc: this._metadata.origin,
            mode: 'dapp',
          })
        );

        // Subscribe to the channel
        subscription = API.graphql<
          GraphQLSubscription<Subscribe2channelSubscription>
        >(graphqlOption).subscribe({
          next: ({ value }) => {
            try {
              if (!value.data?.subscribe2channel?.data) {
                return;
              }

              const txRes: Transaction = JSON.parse(
                value.data.subscribe2channel.data
              );

              // Ignore messages for other transactions
              if (txRes.id !== txInfo.id) {
                return;
              }

              console.log(
                `[signTransaction] Received response for transaction ${txInfo.id}:`,
                txRes.type
              );

              switch (txRes.type) {
                case TransactionType.REQUESTING:
                  console.log('[signTransaction] Transaction requesting...');
                  break;

                case TransactionType.APPROVED:
                  console.log('[signTransaction] Transaction approved');
                  cleanup();
                  resolve(txRes);
                  break;

                case TransactionType.REJECTED:
                  console.log('[signTransaction] Transaction rejected by user');
                  cleanup();
                  reject(new Error(ErrorMessages.Transaction_Rejected));
                  break;

                case TransactionType.READY:
                  // Just informational, continue waiting
                  console.log('[signTransaction] Transaction ready');
                  break;

                case TransactionType.ERROR:
                  console.error(
                    '[signTransaction] Transaction error:',
                    txRes.result
                  );
                  cleanup();
                  reject(
                    new Error(txRes.result || ErrorMessages.Transaction_Error)
                  );
                  break;

                default:
                  console.warn(
                    `[signTransaction] Unknown transaction status: ${txRes.type}`
                  );
                  break;
              }
            } catch (error) {
              console.error(
                '[signTransaction] Error processing subscription message:',
                error
              );
            }
          },
          error: (error) => {
            console.error('[signTransaction] Subscription error:', error);
            cleanup();
            reject(new Error(ErrorMessages.Transaction_SubscriptionError));
          },
          complete: () => {
            console.log('[signTransaction] Subscription completed');
            cleanup();
          },
        });
      } catch (error: any) {
        console.error('[signTransaction] Setup error:', error);
        cleanup();
        reject(
          new Error(error.message || ErrorMessages.Transaction_SetupError)
        );
      }
    });
  }

  /**
   * Fetches requisition information from the activation endpoint.
   * This information is needed to generate QR code content for wallet connection.
   *
   * @returns A Promise resolving to RequisitionInfo object or undefined if an error occurs
   */
  private async _getRequisitionInfo(): Promise<RequisitionInfo | undefined> {
    try {
      // Prepare request body with metadata
      const body = JSON.stringify({
        schema: this._metadata.scheme,
        dapp: this._metadata.origin,
        origin: this._metadata.origin,
        logourl: this._metadata.icon,
        description: this._metadata.description,
        antelope: 'antelope-1',
      });

      // Get single use token for authentication
      const sut = await this._getSingleUseToken();

      if (!sut) {
        console.warn('Failed to get single use token');
        return undefined;
      }

      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

      // Make request to activation endpoint
      const response = await fetch(`${this._activationEndpoint}/dapp/code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-dapp-sdk-sut': sut,
          'X-dapp-sdk-client-id': this._clientId,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle response errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          'Requisition info fetch failed:',
          response.status,
          errorData
        );
        return undefined;
      }

      const data = await response.json();

      // Validate response data
      if (!data || !data.qrCodeContent || !data.code || !data.expire) {
        console.error('Invalid requisition info response:', data);
        return undefined;
      }

      return data;
    } catch (error) {
      console.error('Error fetching requisition info:', error);
      return undefined;
    }
  }

  /**
   * Checks if the wallet connection has been activated by polling the activation endpoint.
   * This function uses interval polling until one of these conditions is met:
   * - User is connected (success)
   * - Connection expired (timeout)
   * - An error occurs
   *
   * @returns A Promise resolving to LoginResponse when activated successfully
   * @throws Error if activation fails, times out, or requisition info is missing
   */
  public async checkActivated(): Promise<LoginResponse> {
    console.log('[checkActivated] begin::', this._requisitionInfo);
    const requisitionInfo = this._requisitionInfo;

    if (!requisitionInfo) {
      throw new Error(ErrorMessages.Activation_NotActivated);
    }

    return new Promise<LoginResponse>((resolve, reject) => {
      // Create a cleanup function to avoid code duplication
      const cleanup = (intervalId: NodeJS.Timeout) => {
        clearInterval(intervalId);
      };

      const intervalId = setInterval(async () => {
        try {
          // Check for expired connection attempt
          const currentTimestamp = Math.floor(Date.now() / 1000);
          if (currentTimestamp > requisitionInfo.expire) {
            console.log(
              '[checkActivated] Activation expired:',
              currentTimestamp,
              requisitionInfo.expire
            );
            cleanup(intervalId);
            return reject(new Error(ErrorMessages.Activation_Expired));
          }

          // Make request to check activation status
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for each poll

          const response = await fetch(
            `${this._activationEndpoint}/dapp/code/check?dapp=${encodeURIComponent(this._metadata.origin)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                code: requisitionInfo.code,
              }),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          // Handle different response status codes
          if (response.status === 202) {
            // Still waiting for activation
            console.log(`[checkActivated] Pending: ${requisitionInfo.code}`);
            return;
          }

          if (response.status === 200) {
            // Successfully activated
            const data = await response.json();
            // Validate response data
            if (!data || !data.token || !data.account) {
              console.warn('[checkActivated] Invalid response data:', data);
            }

            cleanup(intervalId);
            return resolve(data);
          }

          // Handle error status codes
          const errorData = await response.json().catch(() => ({}));
          console.warn(
            `[checkActivated] Error response: ${response.status}`,
            errorData
          );
        } catch (error) {
          // Handle network errors without stopping the polling
          console.error('[checkActivated] Poll error:', error);
          // Don't reject here to allow retrying on transient network errors
        }
      }, this._pollingInterval);

      // Set overall timeout for the activation process (3 mins)
      setTimeout(() => {
        cleanup(intervalId);
        reject(new Error(ErrorMessages.Activation_Timeout));
      }, 180000); // 3 mins timeout
    });
  }

  /**
   * Initiates a direct connection to the wallet app using a deep link.
   * This method attempts to open the wallet application with connection parameters.
   *
   * @returns A Promise resolving when the wallet app is successfully opened
   * @throws Error if the wallet app cannot be opened or parameters are invalid
   */
  public async directConnect(): Promise<void> {
    try {
      // Validate required metadata
      if (!this._metadata?.origin) {
        throw new Error(ErrorMessages.DirectConnect_InvalidMetadata);
      }

      // Build deep link URL with proper encoding
      const params = new URLSearchParams();
      params.append('schema', this._metadata.scheme || '');
      params.append('dapp', this._metadata.origin);
      params.append('origin', this._metadata.origin);
      params.append('logourl', this._metadata.icon || '');
      params.append('description', this._metadata.description || '');
      params.append('antelope', 'antelope-1');

      const link = `${WAX_SCHEME_DEEPLINK}://connect?${params.toString()}`;

      console.log('[directConnect] Attempting to open wallet app');

      // Check if device can open the wallet URL
      const canOpenWallet = await Linking.canOpenURL(link);

      if (!canOpenWallet) {
        console.error('[directConnect] Cannot open wallet app with URL:', link);

        // Determine appropriate action based on platform
        if (Platform.OS === 'ios') {
          console.log('[directConnect] Redirecting to App Store');
          await Linking.openURL(INSTALL_APP_DEEPLINK_IOS);
        } else if (Platform.OS === 'android') {
          console.log('[directConnect] Redirecting to Play Store');
          await Linking.openURL(INSTALL_APP_DEEPLINK_ANDROID);
        } else {
          throw new Error(ErrorMessages.DirectConnect_Cannot_Open_Wallet);
        }
        return;
      }

      // Open the wallet app
      console.log('[directConnect] Opening wallet app');
      await Linking.openURL(link);
    } catch (error) {
      console.error('[directConnect] Error:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : ErrorMessages.DirectConnect_Unknown_Error
      );
    }
  }

  /**
   * Sends a transaction directly to the wallet app using a deep link.
   *
   * @param actions - Array of actions to be executed in the transaction
   * @param namedParams - Named parameters for the transaction
   * @returns A Promise resolving when the transaction has been sent to the wallet
   * @throws Error if validation fails, the wallet cannot be opened, or encoding fails
   */
  public async directTransact(
    actions: any,
    namedParams: Partial<NamedParams> = {}
  ): Promise<void> {
    try {
      // Validate inputs
      if (!actions) {
        throw new Error(ErrorMessages.Transaction_InvalidActions);
      }

      // Encode transaction data safely
      let encodedTransactions: string;
      try {
        const str = JSON.stringify(actions);
        const bytes = new TextEncoder().encode(str);
        const binString = Array.from(bytes)
          .map((byte) => String.fromCharCode(byte))
          .join('');
        encodedTransactions = btoa(binString);
        encodedTransactions = encodedTransactions
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/[=]/g, '');
      } catch (error) {
        console.error(
          '[directTransact] Failed to encode transaction data:',
          error
        );
        throw new Error(ErrorMessages.Transaction_EncodingError);
      }

      // Build transaction URL
      const params = new URLSearchParams();
      params.append('transaction', encodedTransactions);
      params.append('schema', this._metadata.scheme || '');

      // Add named parameters if present
      if (namedParams && Object.keys(namedParams).length > 0) {
        params.append('params', btoa(JSON.stringify(namedParams)));
      }

      const link = `${WAX_SCHEME_DEEPLINK}://transact?${params.toString()}`;

      // Check if the URL can be opened
      console.log('[directTransact] Checking if wallet can be opened');
      const canOpenWallet = await Linking.canOpenURL(link);

      if (!canOpenWallet) {
        console.error('[directTransact] Cannot open wallet with URL');

        // Try to open app stores if wallet is not installed
        if (Platform.OS === 'ios') {
          console.log('[directTransact] Redirecting to App Store');
          await Linking.openURL(INSTALL_APP_DEEPLINK_IOS);
        } else if (Platform.OS === 'android') {
          console.log('[directTransact] Redirecting to Play Store');
          await Linking.openURL(INSTALL_APP_DEEPLINK_ANDROID);
        } else {
          throw new Error(ErrorMessages.DirectConnect_Cannot_Open_Wallet);
        }
        return;
      }

      // Open wallet with transaction
      console.log('[directTransact] Open wallet with link: ', link);
      await Linking.openURL(link);
    } catch (error) {
      console.error('[directTransact] Error:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : ErrorMessages.Transaction_Unknown_Error
      );
    }
  }
}
