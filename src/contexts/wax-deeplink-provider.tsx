import React, { useEffect, useState } from 'react';
import { WaxDeeplinkSDK } from '@/services/wax-deeplink-sdk';
import type {
  NamedParams,
  WaxDeeplinkProviderProps,
  WaxSDKContextState,
} from '../types';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { Linking } from 'react-native';
import { extractURL } from '@/utils/url';
import 'react-native-get-random-values';
import { WAX_SCHEME_DEEPLINK } from '@/constants/urls';

export const WaxDeeplinkContext = createContext<WaxSDKContextState>({
  canDirectConnect: () => Promise.resolve(false),
  connect() {
    throw Error('Method not implemented');
  },
  directConnect() {
    throw Error('Method not implemented');
  },
  directTransact() {
    throw Error('Method not implemented');
  },
  user: undefined,
  isConnected: false,
  error: '',
  disconnect() {
    throw Error('Method not implemented');
  },
  transact() {
    throw Error('Method not implemented');
  },
  getQRCode() {
    throw Error('Method not implemented');
  },
});

export function WaxDeeplinkProvider({
  children,
  ...props
}: PropsWithChildren<WaxDeeplinkProviderProps>) {
  const isInitializedRef = React.useRef(false);

  const [error, setError] = useState<string>('');
  const [refresh, setRefresh] = useState(false);
  const [sdk, setSdk] = useState<WaxDeeplinkSDK | undefined>(undefined);

  const disconnect = useCallback(async () => {
    const response = await sdk?.deactivate();
    setRefresh((e) => !e);
    return response;
  }, [sdk]);

  const connect = useCallback(async () => {
    const response = await sdk?.activate();
    setRefresh((e) => !e);
    return response;
  }, [sdk]);

  const getQRCode = useCallback(
    async (nonce: string) => {
      const content = await sdk?.getQRcodeContent(nonce);
      return content || '';
    },
    [sdk]
  );

  const directConnect = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout after 60 seconds'));
      }, 60000);

      const handleConnection = (url: string) => {
        setRefresh((e) => !e);
        const account = extractURL(url, 'account', false);
        const error = decodeURI(extractURL(url, 'error', false));
        if (account) {
          console.log('[dapp deeplink] account found', account);
          sdk?.setUserData({
            account: account,
            keys: [],
            isTemp: false,
            createData: {},
          });
          clearTimeout(timeout);
          resolve();
        } else if (error) {
          clearTimeout(timeout);
          reject(new Error(error));
        }
      };

      // Add temporary listener for this specific connection attempt
      const subscription = Linking.addEventListener('url', (params: any) => {
        handleConnection(params.url);
      });

      // Start the connection process
      sdk?.directConnect().catch((error) => {
        clearTimeout(timeout);
        subscription.remove();
        reject(error);
      });

      // Cleanup on promise resolution/rejection
      return () => {
        clearTimeout(timeout);
        subscription.remove();
      };
    });
  }, [sdk]);

  const directTransact = useCallback(
    async (actions: any[], namedParams: Partial<NamedParams>) => {
      return new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Transaction timeout after 60 seconds'));
        }, 60000);

        const handleTransaction = (url: string) => {
          setRefresh((e) => !e);
          const txid = extractURL(url, 'txid', false);
          const error = decodeURI(extractURL(url, 'error', false));
          if (txid) {
            console.log(
              '[dapp deeplink] transaction approved with txid:',
              txid
            );
            clearTimeout(timeout);
            resolve({ result: { transaction_id: txid } });
          } else if (error) {
            clearTimeout(timeout);
            reject(new Error(error));
          }
        };

        // Add temporary listener for this specific transaction
        const subscription = Linking.addEventListener('url', (params: any) => {
          handleTransaction(params.url);
        });

        // Start the transaction process
        sdk?.directTransact(actions, namedParams).catch((error) => {
          clearTimeout(timeout);
          subscription.remove();
          reject(error);
        });

        // Cleanup on promise resolution/rejection
        return () => {
          clearTimeout(timeout);
          subscription.remove();
        };
      });
    },
    [sdk]
  );

  const user = useMemo(() => {
    return sdk?.getUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk, refresh]);

  const isConnected = useMemo(() => {
    return sdk?.checkConnected();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk, refresh]);

  const transact = useCallback(
    (actions: any[], namedParams: Partial<NamedParams>) => {
      setRefresh(!refresh);
      return sdk?.signTransaction(actions, namedParams);
    },
    [sdk, refresh]
  );

  const canDirectConnect = useCallback(async () => {
    const link = `${WAX_SCHEME_DEEPLINK}://connect`;
    return Linking.canOpenURL(link);
  }, []);

  const values = useMemo(
    () => ({
      connect,
      disconnect,
      directConnect,
      directTransact,
      user,
      isConnected,
      error,
      transact,
      canDirectConnect,
      getQRCode,
    }),
    [
      connect,
      isConnected,
      disconnect,
      user,
      error,
      transact,
      getQRCode,
      directConnect,
      directTransact,
      canDirectConnect,
    ]
  );

  useEffect(() => {
    if (!isInitializedRef.current) {
      const _sdk = new WaxDeeplinkSDK(props);
      setSdk(_sdk);

      console.log('[dapp deeplink] init');
      Linking.addEventListener('url', (params: any) => {
        const { url } = params;
        const err = extractURL(url, 'error');
        setError(err);
        _sdk?.updateErrorResponse(err);
      });

      isInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <WaxDeeplinkContext.Provider value={values}>
      {children}
    </WaxDeeplinkContext.Provider>
  );
}

export function useWaxSDK() {
  const context = useContext<WaxSDKContextState>(WaxDeeplinkContext);
  if (context === undefined) {
    throw new Error('useWaxSDK must be used within a WaxDeeplinkProvider');
  }
  return context;
}
