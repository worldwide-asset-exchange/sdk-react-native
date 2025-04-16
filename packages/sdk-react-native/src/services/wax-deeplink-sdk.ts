import { BaseWaxSDK } from '@/base';
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
  WaxDeeplinkSDKParams,
  Subscribe2channelSubscription,
} from '../types';
import { Linking, Platform } from 'react-native';
import { API, Amplify, graphqlOperation } from 'aws-amplify';
import { GraphQLSubscription } from '@aws-amplify/api';
import { v4 as uuidv4 } from 'uuid';
import { publish2channel } from '@/utils/socket';

export class WaxDeeplinkSDK extends BaseWaxSDK {
  private _activationEndpoint: string;
  private _clientId: string;
  private _pollingInterval: number;
  private _requisitionInfo?: RequisitionInfo;
  private _error?: string;
  private _isDirrectConnect: boolean;
  private _getSingleUseToken: () => Promise<string>;

  constructor(params: WaxDeeplinkSDKParams) {
    super(params);
    this._activationEndpoint = params.activationEndpoint;
    this._clientId = params.clientId;
    this._pollingInterval = params.opts?.pollingInterval || 5000;
    this._clientId = params.clientId;
    this._getSingleUseToken = params.getSingleUseToken || (async () => '');
    this._isDirrectConnect = false;

    const myAppConfig = {
      aws_appsync_graphqlEndpoint: params.relayEndpoint,
      aws_appsync_region: params.relayRegion,
      aws_appsync_authenticationType: 'AWS_LAMBDA',
    };
    Amplify.configure(myAppConfig);
  }

  public async getQRcodeContent(nonce: string): Promise<string> {
    if (this._isConnected) {
      throw new Error(ErrorMessages.Activation_AlreadyActivated);
    }
    console.log('getQRcodeContent::', { nonce });
    this._error = '';
    const requisitionInfo: RequisitionInfo | void =
      await this._getRequisitionInfo();
    if (requisitionInfo) {
      this._requisitionInfo = requisitionInfo;
      if (nonce) {
        requisitionInfo.qrCodeContent = `${requisitionInfo.qrCodeContent}&nonce=${nonce}`;
        requisitionInfo.nonce = nonce;
      }
      return requisitionInfo.qrCodeContent;
    }
    return `${WAX_SCHEME_DEEPLINK}://request?code=${this._requisitionInfo?.code}&nonce=${nonce}&dapp=${this.metadata.origin}&schema=${this.metadata.scheme}&logourl=${this.metadata.icon}&origin=${this.metadata.origin}&description=${this.metadata.description}&antelope=antelope-1`;
  }

  public async activate(): Promise<LoginResponse | void> {
    if (this._isConnected) {
      throw new Error(ErrorMessages.Activation_AlreadyActivated);
    }
    this._isDirrectConnect = false;
    this._error = '';
    return this._checkActivated();
  }

  public updateErrorResponse(error: string) {
    this._error = error;
  }

  public async deactivate(): Promise<boolean> {
    if (!this._user) {
      throw new Error(ErrorMessages.Activation_NotActivated);
    }

    await fetch(`${this._activationEndpoint}/dapp/deactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this._isConnected = false;
    this._requisitionInfo = undefined;
    this._user = undefined;

    return Promise.resolve(true);
  }

  public async signTransaction(actions: any[], namedParams: any) {
    if (!this._user) {
      throw new Error(ErrorMessages.Activation_NotActivated);
    }
    console.log('signTransaction::', { actions, namedParams });
    const token = this._user?.token;
    const channelName = `dapp:${this.metadata.origin}:${this._user?.account}`;
    const txInfo: Transaction = {
      id: uuidv4(),
      type: TransactionType.REQUESTING,
      actions,
      namedParams,
      dapp: this.metadata.origin,
      schema: this.metadata.scheme,
    };
    API.graphql(
      graphqlOperation(
        publish2channel,
        {
          name: channelName,
          data: JSON.stringify(txInfo),
        },
        JSON.stringify({
          account: this._user?.account,
          token: token,
          svc: this.metadata.origin,
          mode: 'dapp',
        })
      )
    );

    return new Promise((resolve, reject) => {
      let subscription: any;
      const currentTxInfo = txInfo;
      console.log(
        `start listening on ${channelName} with transaction ID = ${currentTxInfo.id}...`
      );

      // Add timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          subscription?.unsubscribe();
          reject(new Error('Transaction timeout after 3 minutes'));
        }, 180000); // 3 minutes in milliseconds
      });

      try {
        const query = `
            subscription Subscribe2channel($name: String!) {
                subscribe2channel(name: $name) {
                    data
                    name
                    __typename
                }
            }
        `;
        //Subscribe via WebSockets
        const graphqlOption = graphqlOperation(
          query,
          {
            name: channelName,
          },
          JSON.stringify({
            account: this._user?.account,
            token: token,
            svc: this.metadata.origin,
            mode: 'dapp',
          })
        );

        const subscriptionPromise = new Promise((resolve, reject) => {
          subscription = API.graphql<
            GraphQLSubscription<Subscribe2channelSubscription>
          >(graphqlOption).subscribe({
            next: ({ provider: _, value }) => {
              console.log('tx', value.data?.subscribe2channel?.data);
              const txRes: Transaction = JSON.parse(
                value.data?.subscribe2channel?.data || ''
              );
              if (txRes.id !== currentTxInfo.id) {
                return;
              }

              switch (txRes.type) {
                case 'requesting':
                  console.log('tx requesting...');
                  break;
                case 'approved':
                  resolve(txRes);
                  subscription?.unsubscribe();
                  break;
                case 'rejected':
                  reject(new Error('User rejected the transaction'));
                  subscription?.unsubscribe();
                  break;
                case 'ready':
                  // ignore
                  break;
                case 'error':
                  reject(new Error(txRes.result));
                  subscription?.unsubscribe();
                  break;
                default:
                  console.log(`Unknown status: ${JSON.stringify(txRes)}`);
                  break;
              }
            },
            error: (error) => {
              subscription?.unsubscribe();
              reject(error);
            },
          });
        });

        // Race between the subscription and timeout
        Promise.race([subscriptionPromise, timeoutPromise])
          .then(resolve)
          .catch(reject);

      } catch (error: any) {
        console.log('error', error.error?.errors);
        subscription?.unsubscribe();
        reject(error);
      }
    });
  }

  public async getUser(): Promise<string> {
    if (!this._user) {
      throw new Error(ErrorMessages.Activation_NotActivated);
    }
    return '';
  }

  private async _getRequisitionInfo(): Promise<RequisitionInfo | void> {
    const body = JSON.stringify({
      schema: this.metadata.scheme,
      dapp: this.metadata.origin,
      origin: this.metadata.origin,
      logourl: this.metadata.icon,
      description: this.metadata.description,
      antelope: 'antelope-1',
    });

    const sut = await this._getSingleUseToken();

    if (sut) {
      const response = await fetch(`${this._activationEndpoint}/dapp/code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-dapp-sdk-sut': sut.toString(),
          'X-dapp-sdk-client-id': this._clientId.toString(),
        },
        body,
      });

      const data = await response.json();
      return data;
    }
  }

  private async _checkActivated(): Promise<LoginResponse> {
    console.log('[checkActivated] begin::', this._requisitionInfo);
    const requisitionInfo = this._requisitionInfo;

    if (!requisitionInfo) {
      throw new Error(ErrorMessages.Activation_NotActivated);
    }

    return new Promise<LoginResponse>((resolve, reject) => {
      const intervalId = setInterval(async () => {
        if (this._error) {
          console.log('[checkActivated] error::', this._error);
          clearInterval(intervalId);
          reject(new Error(this._error));
        }
        if (this._user) {
          console.log('[checkActivated] user::', this._user);
          clearInterval(intervalId);
          resolve(this._user);
        }
        const currentTimestamp = Math.floor(Date.now() / 1000);

        if (currentTimestamp > requisitionInfo.expire) {
          console.log(
            'Current time is greater than expiration. Stopping pulling checkActivation.',
            currentTimestamp,
            requisitionInfo.expire
          );
          clearInterval(intervalId);
          reject(new Error(ErrorMessages.Activation_Expired));
        }

        const response = await fetch(
          `${this._activationEndpoint}/dapp/code/check?dapp=${this.metadata.origin}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: requisitionInfo.code,
            }),
          }
        );

        const data = await response.json();

        if (response.status === 202) {
          console.log(`Checking activation: ${requisitionInfo.code} ...`);
        } else if (response.status === 200) {
          this._user = data;
          this._isConnected = true;
        }
      }, this._pollingInterval);
    });
  }

  public async directConnect(): Promise<LoginResponse | void> {
    if (this._isConnected) {
      throw new Error(ErrorMessages.Activation_AlreadyActivated);
    }
    this._isDirrectConnect = true;
    const link = `${WAX_SCHEME_DEEPLINK}://connect?schema=${this.metadata.scheme}&dapp=${this.metadata.origin}&origin=${this.metadata.origin}&logourl=${this.metadata.icon}&description=${this.metadata.description}&antelope=antelope-1`;
    // Open wallet app via Universal Link
    const canOpenWallet = await Linking.canOpenURL(link);
    if (canOpenWallet) {
      console.log('[provider] opening wallet', link);
      Linking.openURL(link);
    } else {
      throw new Error(ErrorMessages.DirectConnect_Cannot_Open_Wallet);
    }
  }

  public async directTransact(actions: any[], namedParams: any) {
    if (!this._isDirrectConnect) {
      throw new Error(ErrorMessages.DirectConnect_NotActivated);
    }
    console.log('[provider] directTransact', { actions, namedParams });
    const enccodeTransactions = btoa(JSON.stringify(actions));

    // Sign transaction via Universal Link
    const link = `${WAX_SCHEME_DEEPLINK}://transact?transaction=${enccodeTransactions}&schema=${this.metadata.scheme}`;
    console.log('[provider] directTransact', link);
    const canOpenWallet = await Linking.canOpenURL(link);
    if (canOpenWallet) {
      Linking.openURL(link);
    } else {
      throw new Error(ErrorMessages.DirectConnect_Cannot_Open_Wallet);
    }
  }
}
