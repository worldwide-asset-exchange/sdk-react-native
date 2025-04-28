import { NamedParams } from './transaction';

export interface DappMetadata {
  name: string;
  origin: string;
  icon?: string;
  description?: string;
  scheme: string;
}

export interface UserData {
  account: string;
  keys: string[];
  isTemp?: boolean;
  createData?: any;
  avatarUrl?: string;
  trustScore?: number;
  isProofVerified?: any;
  token?: string;
}

export interface WaxSDKContextState {
  // Connection Status
  isConnected: boolean;
  canDirectConnect: () => Promise<boolean>;
  user?: UserData;
  error?: string;

  // Connection Methods
  directConnect: () => Promise<void>;
  connect: () => Promise<void>;

  // Transaction Methods
  directTransact: (
    actions: any,
    namedParams: Partial<NamedParams>
  ) => Promise<any>;
  transact: (actions: any, namedParams: Partial<NamedParams>) => Promise<any>;

  // Disconnect Methods
  disconnect: () => Promise<any>;

  // Utility Methods
  getQRCode: (nonce: string) => Promise<string>;

  // Loading States
  isLoading: boolean;
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

export interface WaxDeeplinkSDKParams {
  readonly activationEndpoint: string;
  readonly relayEndpoint: string;
  readonly relayRegion: string;
  opts?: WaxDeeplinkOpts;

  readonly clientId: string;
  readonly getSingleUseToken?: () => Promise<string>;
}

export interface WaxDeeplinkProviderProps extends WaxDeeplinkSDKParams {
  metadata: DappMetadata;
}
