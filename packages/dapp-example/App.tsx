import React, { useCallback, useState } from "react";
import { WaxDeeplinkProvider } from "@waxio/sdk-react-native";
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Image, ScrollView } from "react-native";
import Toast from "react-native-toast-message";

import { Example } from "./Example";
import { _CONFIG, _networkType, APP_CONFIG } from "./config";

import WaxIcon from "./assets/icon/wax.png";

export default function App() {
  const [networkType, setNetworkType] = useState<_networkType>(_networkType.wax_mainnet);
  // Add a key state to force re-render of WaxDeeplinkProvider
  const [providerKey, setProviderKey] = useState<number>(0);

  // TODO: Implement this function withn your own backend to get the single use token
  const _getSingleUseToken = useCallback(async (): Promise<string> => {
    const fakeSingleUseToken = "1234567890";
    // return as promise
    return new Promise((resolve) => {
      resolve(fakeSingleUseToken);
    });
  }, [networkType]);

  const toggleNetwork = () => {
    // Simple toggle between the two network types
    const newNetworkType = networkType === _networkType.wax_mainnet
      ? _networkType.wax_stg
      : _networkType.wax_mainnet;

    console.log(`Switching to ${newNetworkType}`);
    setNetworkType(newNetworkType);

    // Increment the key to force WaxDeeplinkProvider to re-mount
    setProviderKey(prevKey => prevKey + 1);

    // Show toast to inform the user
    Toast.show({
      type: "success",
      text1: "Network Changed",
      text2: `Switched to ${newNetworkType}`,
    });
  };

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <TouchableOpacity
          onLongPress={toggleNetwork}
          delayLongPress={500}
          style={styles.networkSelector}
        >
          <View style={styles.networkContainer}>
            <Image style={styles.networkIcon} source={WaxIcon} />
            <Text style={styles.networkText}>{networkType}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  console.log("_CONFIG?.[networkType]?.RELAY_ENDPOINT", _CONFIG?.[networkType]?.RELAY_ENDPOINT);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView>
        <View style={styles.container}>
          {renderHeader()}
          <WaxDeeplinkProvider
            key={providerKey}
            opts={{ pollingInterval: 2000 }}
            metadata={APP_CONFIG}
            getSingleUseToken={_getSingleUseToken}
            activationEndpoint={`${_CONFIG?.[networkType]?.ACTIVATION_ENDPOINT}/v1/wcw`}
            clientId={_CONFIG?.[networkType]?.CLIENT_ID}
            relayEndpoint={_CONFIG?.[networkType]?.RELAY_ENDPOINT}
            relayRegion={_CONFIG?.[networkType]?.RELAY_REGION}
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
    backgroundColor: "#1E1929",
  },
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 24,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  networkSelector: {
    backgroundColor: "#2A253B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  networkContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },
  networkIcon: {
    width: 32,
    height: 32,
  },
  networkText: {
    color: "#E1DFFA",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.56,
  },
});
