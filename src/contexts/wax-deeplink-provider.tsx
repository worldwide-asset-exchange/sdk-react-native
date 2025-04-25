import React, { useEffect, useRef, useState } from 'react';
import { WaxDeeplinkSDK } from '@/services/wax-deeplink-sdk';
import type {
  NamedParams,
  RequisitionInfo,
  UserData,
  WaxDeeplinkProviderProps,
  WaxSDKContextState,
} from '../types';
import {
  createContext,
  PropsWithChildren,
  useContext,
} from 'react';
import { Linking } from 'react-native';
import 'react-native-get-random-values';
import { WAX_SCHEME_DEEPLINK } from '@/constants/urls';

export const WaxDeeplinkContext = createContext<WaxSDKContextState>({
  isConnected: false,
  canDirectConnect: async () => false,

  // Default methods that will be overridden by actual implementation
  directConnect: async () => { throw new Error('WaxDeeplinkProvider not initialized'); },
  connect: async () => { throw new Error('WaxDeeplinkProvider not initialized'); },
  directTransact: async () => { throw new Error('WaxDeeplinkProvider not initialized'); },
  transact: async () => { throw new Error('WaxDeeplinkProvider not initialized'); },
  getQRCode: async () => { throw new Error('WaxDeeplinkProvider not initialized'); },
  disconnect : async () => { throw new Error('WaxDeeplinkProvider not initialized'); },
  isLoading: false,
});

export function WaxDeeplinkProvider({
  children,
  ...props
}: PropsWithChildren<WaxDeeplinkProviderProps>) {
  // Reference to the SDK instance
  const sdkRef = useRef<WaxDeeplinkSDK | null>(null);

  // State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [user, setUser] = useState<UserData | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize SDK on component mount (only once)
  useEffect(() => {
    // Initialize the SDK only once when the component mounts
    if (!sdkRef.current) {
      console.log('Initializing WaxDeeplinkSDK');

      // Create a new instance of the SDK with the props passed to the context
      sdkRef.current = new WaxDeeplinkSDK(props);

      // Setup global deeplink listener for handling wallet responses
      setupDeeplinkListeners();
    }

    // Clean up on unmount
    return () => {
      // Remove any event listeners when the component unmounts
      // This would be implemented with actual event listeners in production
      // Example: Linking.removeEventListener('url', handleDeepLinkGlobal);
    };
  }, []);

  // Set up global deeplink listeners
  const setupDeeplinkListeners = () => {
    // Example: Linking.addEventListener('url', handleDeepLinkGlobal);

    // This is where we'd handle deeplinks that come in when the app is already running
    // or when it's launched via a deeplink
  };

  // Connect via Deeplink
  const handleConnectViaDeeplink = async (): Promise<void> => {
    // Validate SDK initialization
    if (!sdkRef.current) {
      const errorMsg = 'SDK not initialized';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(undefined);

    // Clean up any existing listeners first
    Linking.removeAllListeners('url');

    return new Promise<void>((resolve, reject) => {
      // Create a reusable cleanup function
      const cleanup = () => {
        Linking.removeAllListeners('url');
        setIsLoading(false);
      };

      // Set up timeout for 60 seconds
      const timeout = setTimeout(() => {
        const errorMsg = 'Connection timeout after 60 seconds';
        cleanup();
        setError(errorMsg);
        reject(new Error(errorMsg));
      }, 60000);

      // Function to handle the deeplink response
      const handleDeeplinkResponse = (event: { url: string }) => {
        try {
          // Parse the URL to extract parameters
          const parsedUrl = new URL(event.url);
          const params = new URLSearchParams(parsedUrl.search);

          const accountName = params.get('account');

          // Proper validation of account name
          if (!accountName) {
            throw new Error('No account name received in deeplink response');
          }

          // Construct the user data from URL params with validated data
          const userData: UserData = {
            account: accountName,
            keys: [],
            isTemp: false,
          };

          // Update state
          setUser(userData);
          setIsConnected(true);

          // Clean up and resolve
          clearTimeout(timeout);
          cleanup();
          resolve();
        } catch (error) {
          // Handle parsing errors with specific error messages
          clearTimeout(timeout);
          cleanup();
          const errorMsg = error instanceof Error
            ? error.message
            : 'Failed to process deeplink response';
          setError(errorMsg);
          reject(new Error(errorMsg));
        }
      };

      // Add listener for the URL event
      Linking.addEventListener('url', handleDeeplinkResponse);

      // Start the connection process by calling the SDK
      sdkRef.current!.directConnect().catch((error: Error) => {
        clearTimeout(timeout);
        cleanup();
        const errorMsg = error.message || 'Failed to initiate deeplink connection';
        setError(errorMsg);
        reject(error); // Preserve original error object
      });
    });
  };

  // Get QR code method 
  const handleGetQRCode = async (nonce: string): Promise<string> => {
    // Validate SDK initialization
    if (!sdkRef.current) {
      const errorMsg = 'SDK not initialized';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }

    // Validate input
    if (!nonce) {
      const errorMsg = 'Nonce is required for QR code generation';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(undefined);

    return new Promise<string>((resolve, reject) => {
      // Create a reusable cleanup function
      const cleanup = () => {
        setIsLoading(false);
      };

      // Set up timeout for 30 seconds (reduced from 60 as QR generation should be quicker)
      const timeout = setTimeout(() => {
        const errorMsg = 'QR code request timeout after 30 seconds';
        cleanup();
        setError(errorMsg);
        reject(new Error(errorMsg));
      }, 30000);

      // Request QR code from SDK with simplified error handling
      sdkRef.current!.getQRCode(nonce)
        .then((qrCodeUrl: string) => {
          clearTimeout(timeout);
          cleanup();
          resolve(qrCodeUrl);
        })
        .catch((error: Error) => {
          clearTimeout(timeout);
          cleanup();
          const errorMsg = error.message || 'Failed to generate QR code';
          setError(errorMsg);
          reject(error); // Preserve original error object
        });
    });
  };
  // Connect via WebSocket
  const handleConnectViaWebSocket = async (): Promise<any> => {
    // Validate SDK initialization
    if (!sdkRef.current) {
      const errorMsg = 'SDK not initialized';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(undefined);

    return new Promise<RequisitionInfo>((resolve, reject) => {
      // Create a reusable cleanup function
      const cleanup = () => {
        setIsLoading(false);
      };

      // Set up timeout for 60 seconds
      const timeout = setTimeout(() => {
        const errorMsg = 'Connection timeout after 60 seconds';
        cleanup();
        setError(errorMsg);
        reject(new Error(errorMsg));
      }, 600000);

      // Connect via WebSocket with simplified error handling
      sdkRef.current!.checkActivated()
        .then((result: any) => {
          clearTimeout(timeout);
          // Update state
          setUser(result);
          setIsConnected(true);
          cleanup();
          resolve(result);
        })
        .catch((error: Error) => {
          setUser(undefined);
          setIsConnected(false);
          clearTimeout(timeout);
          cleanup();
          const errorMsg = error.message || 'Unknown error during WebSocket connection';
          setError(errorMsg);
          reject(error); // Preserve original error object
        });
    });
  };

  // Sign Transaction via Deeplink
  const handleSignTransactionViaDeeplink = async (actions: any, namedParams: Partial<NamedParams>): Promise<any> => {
    // Validate SDK initialization
    if (!sdkRef.current) {
      const errorMsg = 'SDK not initialized';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }

    // Validate user is logged in
    if (!user?.account) {
      const errorMsg = 'User does not login';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(undefined);

    // Clean up any existing listeners first
    Linking.removeAllListeners('url');

    return new Promise<any>((resolve, reject) => {
      // Create a reusable cleanup function
      const cleanup = () => {
        Linking.removeAllListeners('url');
        setIsLoading(false);
      };

      // Set up timeout for 60 seconds
      const timeout = setTimeout(() => {
        const errorMsg = 'Connection timeout after 60 seconds';
        cleanup();
        setError(errorMsg);
        reject(new Error(errorMsg));
      }, 60000);

      // Function to handle the deeplink response
      const handleDeeplinkResponse = (event: { url: string }) => {
        console.log('event', event)
        try {
          // Parse the URL to extract parameters
          const parsedUrl = new URL(event.url);
          const params = new URLSearchParams(parsedUrl.search);

          const txid = params.get('txid');
          const errorParam = params.get('error');
          console.log('txid:', txid)
          console.log('errorParam:', errorParam)
          // Clean up and resolve
          clearTimeout(timeout);
          cleanup();
          if(errorParam){
            reject(new Error(errorParam))
          }

          if(txid){
            resolve({ result: { transaction_id: txid } });
          }
        } catch (error) {
          // Handle parsing errors
          clearTimeout(timeout);
          cleanup();
          const errorMsg = 'Failed to process deeplink response';
          setError(errorMsg);
          reject(new Error(errorMsg));
        }
      };

      // Add listener for the URL event
      Linking.addEventListener('url', handleDeeplinkResponse);

      // Start the transaction signing process with simplified error handling
      sdkRef.current!.directTransact(actions, namedParams).catch((error: Error) => {
        clearTimeout(timeout);
        cleanup();
        const errorMsg = error.message || 'Failed to sign transaction deeplink connection';
        setError(errorMsg);
        reject(error); // Preserve original error object
      });
    });
  };

  // Sign Transaction via Websocket
  const handleSignTransactionViaSocket = async (actions: any, namedParams: Partial<NamedParams>): Promise<any> => {
    // Validate SDK initialization
    if (!sdkRef.current) {
      const errorMsg = 'SDK not initialized';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }

    // Validate user is logged in
    if (!user?.account) {
      const errorMsg = 'User does not login';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(undefined);

    return new Promise<RequisitionInfo>((resolve, reject) => {
      // Create a reusable cleanup function
      const cleanup = () => {
        setIsLoading(false);
      };

      // Set up timeout for 60 seconds
      const timeout = setTimeout(() => {
        const errorMsg = 'Connection timeout after 60 seconds';
        cleanup();
        setError(errorMsg);
        reject(new Error(errorMsg));
      }, 600000);

      // Connect via WebSocket with simplified error handling
      sdkRef.current!.signTransaction(actions, namedParams, user)
        .then((result: any) => {
          clearTimeout(timeout);
          cleanup();
          resolve(result);
        })
        .catch((error: Error) => {
          clearTimeout(timeout);
          cleanup();
          const errorMsg = error.message || 'Unknown error during WebSocket connection';
          setError(errorMsg);
          reject(error); // Preserve original error object
        });
    });
  };

  //Check if the device can open the WAX deeplink
  const canDirectConnect = async (): Promise<boolean> => {
    try {
      // Check if the device can open the WAX deeplink
      const canOpen = await Linking.canOpenURL(`${WAX_SCHEME_DEEPLINK}://connect`);
      return canOpen;
    } catch (error) {
      // Log the error but don't propagate it - just return false
      console.error('Error checking if deep link can be opened:', error);
      return false;
    }
  };

  //Disconnect method
  const disconnect = async () => {
    setIsConnected(false)
    setError(undefined)
    setUser(undefined)
    setIsLoading(false)
  }

  // Prepare context value
  const contextValue: WaxSDKContextState = {
    isConnected,
    canDirectConnect,
    user,
    error,
    directConnect: handleConnectViaDeeplink,
    connect: handleConnectViaWebSocket,
    directTransact: handleSignTransactionViaDeeplink,
    transact: handleSignTransactionViaSocket,
    disconnect: disconnect,
    getQRCode: handleGetQRCode,
    isLoading,
  };

  return (
    <WaxDeeplinkContext.Provider value={contextValue}>
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
