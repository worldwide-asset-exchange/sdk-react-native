import { IBaseWaxSDKParams } from '../base/base-sdk';
import { NamedParams } from './transaction';

export interface DappMetadata {
  name: string;
  origin: string;
  icon?: string;
  description?: string;
  scheme: string;
}

export interface WaxSDKContextState {
  canDirectConnect: () => Promise<boolean>;
  connect: (nonce: string) => Promise<void | LoginResponse | undefined>;
  directConnect: () => Promise<void>;
  disconnect: () => Promise<boolean | undefined>;
  user: LoginResponse | undefined;
  isConnected: boolean | undefined;
  getQRCode: (nonce: string) => Promise<string>;
  error: string;
  transact: (
    actions: any,
    namedParams: Partial<NamedParams>
  ) => Promise<any> | undefined;
  directTransact: (
    actions: any,
    namedParams: Partial<NamedParams>
  ) => Promise<any> | undefined;
}

export interface RequisitionInfo {
  code: string;
  qrCodeContent: string;
  expire: number;
  chain_type?: string;
  description?: string;
  logourl?: string;
  name?: string;
  origin?: string;
  schema?: string;
  nonce?: string;
}

export interface LoginResponse {
  account: string;
  keys: string[];
  isTemp?: boolean;
  createData?: any;
  avatarUrl?: string;
  trustScore?: number;
  isProofVerified?: any;
  token?: string;
}

export interface WhitelistedContract {
  contract: string;
  domain: string;
  recipients: string[];
}

export interface WaxDeeplinkOpts {
  pollingInterval?: number;
  autoConnect?: boolean;
}

export interface WaxDeeplinkSDKParams extends IBaseWaxSDKParams {
  readonly activationEndpoint: string;
  readonly relayEndpoint: string;
  readonly relayRegion: string;
  opts?: WaxDeeplinkOpts;

  readonly clientId: string;
  // Optional property for getSingleUseToken
  readonly getSingleUseToken?: () => Promise<string>;
}

export interface WaxDeeplinkProviderProps extends WaxDeeplinkSDKParams {
  readonly activationEndpoint: string;
  readonly relayEndpoint: string;
  readonly clientId: string;
  readonly getSingleUseToken?: () => Promise<string>;
  opts?: WaxDeeplinkOpts;
  chain?: string;
  metadata: DappMetadata;
}
