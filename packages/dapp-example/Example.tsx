import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Clipboard,
} from 'react-native';

import { useWaxSDK } from '@waxio/sdk-react-native';
import React, { useState } from 'react';
import Toast from 'react-native-toast-message';
import QRCode from 'react-native-qrcode-svg';

enum ConnectionType {
  DISCONNECTED = 'disconnected',
  WS_CONNECTED = 'ws_connected',
  DIRECT_CONNECTED = 'direct_connected',
}

enum ConnectionMode {
  WS = 'ws',
  DIRECT = 'direct',
}

export const Example = () => {
  const {
    connect,
    directConnect,
    canDirectConnect,
    user,
    transact,
    directTransact,
    disconnect,
    getQRCode,
  } = useWaxSDK();

  // State management for UI feedback
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [connectionType, setConnectionType] = useState<ConnectionType>(
    ConnectionType.DISCONNECTED
  );
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(
    ConnectionMode.WS
  );

  const handleModeChange = (mode: ConnectionMode) => {
    setConnectionMode(mode);
    setIsConnecting(false);
    setShowQRCode(false);
  };

  const handleSignTransaction = async () => {
    if (!user?.account) {
      Toast.show({
        type: 'error',
        text1: 'Connection Required',
        text2: 'Please connect your wallet first',
      });
      return;
    }

    setIsSigning(true);
    const memo = Date.now();
    const exampleActions = {
      account: 'eosio.token',
      name: 'transfer',
      authorization: [
        {
          actor: user?.account,
          permission: 'active',
        },
      ],
      data: {
        from: user?.account,
        to: 'hoangngoctam',
        quantity: '0.00000001 WAX',
        memo: `${memo}. Transfer WAX`,
      },
    };

    try {
      console.log('transact', exampleActions);
      const response = await transact(exampleActions, {
        blocksBehind: 3,
        expireSeconds: 30000,
      });

      Toast.show({
        type: 'success',
        text1: 'Transaction Successful',
        text2: `ID: ${response?.result?.transaction_id.substring(0, 10)}...`,
      });
      return response;
    } catch (err: any) {
      console.error(err);
      setIsSigning(false);
      Toast.show({
        type: 'error',
        text1: 'Transaction Failed',
        text2: `${err?.message || 'Something went wrong'}`,
      });
    } finally {
      setIsSigning(false);
    }
  };

  const handleDirectSignTransaction = async () => {
    if (!user?.account) {
      Toast.show({
        type: 'error',
        text1: 'Connection Required',
        text2: 'Please connect your wallet first',
      });
      return;
    }

    setIsSigning(true);
    const memo = Date.now();
    const exampleActions = {
      account: 'eosio.token',
      name: 'transfer',
      authorization: [
        {
          actor: user?.account,
          permission: 'active',
        },
      ],
      data: {
        from: user?.account,
        to: 'hoangngoctam',
        quantity: '0.00000001 WAX',
        memo: `${memo}. Transfer WAX`,
      },
    };

    if (await canDirectConnect()) {
      try {
        setIsSigning(true);
        const response = await directTransact(exampleActions, {
          blocksBehind: 3,
          expireSeconds: 30000,
        });
        setIsSigning(false);
        Toast.show({
          type: 'success',
          text1: 'Transaction Successful',
          text2: `ID: ${response?.result?.transaction_id.substring(0, 10)}...`,
        });
      } catch (err: any) {
        console.error(err);
        Toast.show({
          type: 'error',
          text1: 'Transaction Failed',
          text2: `${err?.message || 'Something went wrong'}`,
        });
      } finally {
        setIsSigning(false);
      }
    } else {
      Toast.show({
        type: 'error',
        text1: 'Cannot direct connect',
        text2: 'Cloud Wallet app is not installed!',
      });
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const nonce = 'nonce-example';
      const qrCode = await getQRCode(nonce);
      console.log('[handleConnect] qrCode:>>', qrCode);
      setQrCode(qrCode);
      setShowQRCode(true);

      await connect(nonce);
      setConnectionType(ConnectionType.WS_CONNECTED);
    } catch (err: any) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Connection Failed',
        text2: `${err?.message || 'Something went wrong'}`,
      });
    } finally {
      setIsConnecting(false);
      setShowQRCode(false);
    }
  };

  const handleDirrectConnect = async () => {
    if (!(await canDirectConnect())) {
      Toast.show({
        type: 'error',
        text1: 'Cannot direct connect',
        text2: 'Cloud Wallet app is not installed!',
      });
      return;
    }
    console.log('canDirectConnect, connecting...');
    setIsConnecting(true);
    setShowQRCode(false);
    try {
      await directConnect();
      setConnectionType(ConnectionType.DIRECT_CONNECTED);
      setIsConnecting(false);
    } catch (err: any) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Connection Failed',
        text2: `${err?.message || 'Something went wrong'}`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect();
      setShowQRCode(false);
      setConnectionType(ConnectionType.DISCONNECTED);
      Toast.show({
        type: 'success',
        text1: 'Disconnected',
        text2: 'Wallet has been disconnected',
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Disconnect Failed',
        text2: `${err?.message || 'Something went wrong'}`,
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const renderQr = () => {
    if (showQRCode && qrCode) {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.qrCodeWrapper}>
            <QRCode size={190} value={qrCode} logoSize={150} />
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => {
                Clipboard.setString(qrCode);
                Toast.show({
                  type: 'success',
                  text1: 'Copied',
                });
              }}
            >
              <Text style={styles.copyButtonText}>Copy URI</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.accountHeader}>
          <Text style={styles.accountLabel}>Account</Text>
          <Text style={styles.accountAddress}>
            {user?.account || 'Not connected'}
          </Text>
        </View>

        {!user?.account && (
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                connectionMode === ConnectionMode.WS && styles.modeButtonActive,
              ]}
              onPress={() => handleModeChange(ConnectionMode.WS)}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  connectionMode === ConnectionMode.WS &&
                    styles.modeButtonTextActive,
                ]}
              >
                WebSocket
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                connectionMode === ConnectionMode.DIRECT &&
                  styles.modeButtonActive,
              ]}
              onPress={() => handleModeChange(ConnectionMode.DIRECT)}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  connectionMode === ConnectionMode.DIRECT &&
                    styles.modeButtonTextActive,
                ]}
              >
                Direct
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {renderQr()}

        <View style={styles.buttonGroup}>
          {!user?.account && (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (isConnecting || !!user?.account) && styles.buttonDisabled,
                user?.account && styles.buttonSuccess,
              ]}
              onPress={
                connectionMode === ConnectionMode.WS
                  ? handleConnect
                  : handleDirrectConnect
              }
              disabled={isConnecting || !!user?.account}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[styles.modeButtonText, styles.modeButtonTextActive]}
                >
                  {connectionMode === ConnectionMode.WS
                    ? showQRCode
                      ? 'Connecting...'
                      : 'Generate QR Code'
                    : 'Connect'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {user?.account && (
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isSigning && styles.buttonDisabled,
                !user?.account && styles.buttonDisabled,
              ]}
              onPress={
                connectionType === ConnectionType.DIRECT_CONNECTED
                  ? handleDirectSignTransaction
                  : handleSignTransaction
              }
              disabled={isSigning || !user?.account}
            >
              {isSigning ? (
                <ActivityIndicator size="small" color="#CDAAEE" />
              ) : (
                <Text style={styles.buttonText}>
                  {connectionType === ConnectionType.DIRECT_CONNECTED
                    ? 'Direct Sign'
                    : 'Sign'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {user?.account && (
        <TouchableOpacity
          style={[
            styles.disconnectButton,
            isDisconnecting && styles.buttonDisabled,
          ]}
          onPress={handleDisconnect}
          disabled={isDisconnecting}
        >
          {isDisconnecting ? (
            <ActivityIndicator size="small" color="#CDAAEE" />
          ) : (
            <Text style={styles.buttonText}>Disconnect</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Layout
  wrapper: {
    flex: 1,
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  card: {
    width: '100%',
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#363448',
    backgroundColor: '#1F1E28',
    shadowColor: 'rgba(43, 56, 125, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 4,
    gap: 24,
  },
  contentContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    minHeight: 200,
  },
  buttonGroup: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
  },

  // Account header
  accountHeader: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#363448',
    backgroundColor: '#2A2937',
  },
  accountLabel: {
    color: '#E1DFFA',
    fontSize: 16,
    fontWeight: '600',
  },
  accountAddress: {
    color: '#CDAAEE',
    fontSize: 16,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },

  // QR code
  qrCodeWrapper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },

  // Buttons
  primaryButton: {
    borderRadius: 12,
    width: '100%',
    height: 56,
    paddingVertical: 16,
    paddingHorizontal: 24,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8549B6',
  },
  secondaryButton: {
    borderRadius: 12,
    width: '100%',
    height: 56,
    paddingVertical: 16,
    paddingHorizontal: 24,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#B3AEDF',
  },
  disconnectButton: {
    width: '100%',
    height: 56,
    paddingVertical: 16,
    paddingHorizontal: 24,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#363448',
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 1,
    backgroundColor: '#2A2937',
  },
  buttonSuccess: {
    backgroundColor: '#3E885B',
  },
  buttonText: {
    color: '#CDAAEE',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.56,
    textTransform: 'uppercase',
  },
  buttonTextDisabled: {
    color: '#6B6A7D',
  },
  modeSelector: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#363448',
    backgroundColor: '#2A2937',
  },
  modeButtonActive: {
    backgroundColor: '#8549B6',
    borderColor: '#8549B6',
  },
  modeButtonText: {
    color: '#E1DFFA',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  copyButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  copyButtonText: {
    color: '#8549B6',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
