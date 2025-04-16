<h1 align="center">
  <br>
    WAX Mobile SDKs
  <br>
</h1>

Wax Mobile SDK enables developers to easily connect their dapps with the WaxCloudWallet Mobile.

## 🗃️ Table of Contents

- [🗃️ Table of Contents](#️-table-of-contents)
- [React Native](#react-native)
  - [📦 Installation](#-installation)
- [🧑‍💻 Usage](#-usage)
- [💎 Contributing](#-contributing)
- [License](#license)

## React Native

### 📦 Installation

Install the SDK package.

```sh
npm install @waxio/sdk-react-native
```

or

```sh
yarn add @waxio/sdk-react-native
```

## 🧑‍💻 Usage

We recommend using React Native v0.71.4 or higher to avoid performance issues on Android.

See the [React Native Example](./packages/example/README.md) and read the documentation for using the SDK with React Native for more information.

First, set up your application to work with deep links across different platforms. Read the [document](https://reactnavigation.org/docs/deep-linking/).

Then Add mycloudwallet to LSApplicationQueriesSchemes in your Info.plist and AndroidManifest.xml.

```
// ...
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>mycloudwallet</string>
</array>
```

```
  //...
  <queries>
    <intent>
        <action android:name="android.intent.action.VIEW" />
        <data android:scheme="mycloudwallet" android:host="*" />
    </intent>
  </queries>
```

Wrap your application in the provider

```js
import { WaxDeeplinkProvider } from '@waxio/sdk-react-native';

export default function RootLayout() {
  return (
    //...
    <WaxDeeplinkProvider
      opts={{ pollingInterval: 2000 }}
      metadata={{
        name: 'DappExample',
        origin: 'dappexample',
        description: 'This is test dapp example',
        scheme: 'dappexample',
        icon: 'https://example.com/200/300',
      }}
      activationEndpoint="..."
      relayEndpoint="..."
      relayRegion="..."
    >
      ...
    </WaxDeeplinkProvider>
  );
}
```

Use the SDK in your components:

```js
import { useWaxSDK } from '@waxio/sdk-react-native';

// ...

const { connect, disconnect, transact, user } = useWaxSDK();
```

## 💎 Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---
