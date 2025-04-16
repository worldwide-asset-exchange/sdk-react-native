import type { LoginResponse, DappMetadata } from '@/types';

export interface IBaseWaxSDKParams {
  chain?: string;
  metadata: DappMetadata;
}

export abstract class BaseWaxSDK {
  protected _isConnected: boolean;
  protected _user?: LoginResponse;

  public chain?: string;
  public metadata: DappMetadata;

  constructor(params: IBaseWaxSDKParams) {
    this.chain = params.chain;
    this.metadata = params.metadata;
    this._isConnected = false;
  }

  abstract activate(): Promise<LoginResponse | void>;
  abstract deactivate(): Promise<boolean>;

  checkConnected(): boolean {
    return this._isConnected;
  }

  getUserData(): LoginResponse | undefined {
    return this._user;
  }

  setUserData(user: LoginResponse): void {
    this._user = user;
  }
}
