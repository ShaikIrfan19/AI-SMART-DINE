import React from 'react';
import { Provider } from 'react-redux';
import { StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';
import store from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';

export default function App() {
  return (
    <Provider store={store}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <AppNavigator />
      <Toast
        config={{
          success: ({ text1, text2 }) => null, // Uses default
          error: ({ text1, text2 }) => null,
        }}
      />
    </Provider>
  );
}
