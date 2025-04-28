import React, { useCallback } from 'react';
import { WaxDeeplinkProvider } from '@waxio/sdk-react-native';
import {
  StyleSheet,
  View,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { Example } from './Example';
import { APP_CONFIG } from './config';

import WaxIcon from './assets/icon/wax.png';

export default function App() {
  // TODO: Implement this function withn your own backend to get the single use token
  const _getSingleUseToken = useCallback(async (): Promise<string> => {
    const fakeSingleUseToken = '1234567890';
    // return as promise
    return new Promise((resolve) => {
      resolve(fakeSingleUseToken);
    });
  }, []);

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <TouchableOpacity delayLongPress={500} style={styles.networkSelector}>
          <View style={styles.networkContainer}>
            <Image style={styles.networkIcon} source={WaxIcon} />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView>
        <View style={styles.container}>
          {renderHeader()}
          <WaxDeeplinkProvider
            opts={{ pollingInterval: 2000 }}
            metadata={APP_CONFIG}
            getSingleUseToken={_getSingleUseToken}
            activationEndpoint={'dApp activation endpoint'}
            clientId={'<dApp client ID>'}
            relayEndpoint={'https://queue-relay.mycloudwallet.com/graphql'}
            relayRegion={'us-east-2'}
          >
            <Example />
          </WaxDeeplinkProvider>
          <Toast />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E1929',
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 24,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  networkSelector: {
    backgroundColor: '#2A253B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  networkContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  networkIcon: {
    width: 32,
    height: 32,
  },
  networkText: {
    color: '#E1DFFA',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.56,
  },
});
