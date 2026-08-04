import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { TouchableOpacity, View, Text } from 'react-native';
import { colors } from '../theme';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OTPScreen from '../screens/auth/OTPScreen';

// Customer Screens
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import MenuScreen from '../screens/customer/MenuScreen';
import CartScreen from '../screens/customer/CartScreen';
import OrderTrackingScreen from '../screens/customer/OrderTrackingScreen';
import ReservationScreen from '../screens/customer/ReservationScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

// Waiter Screens
import WaiterDashboard from '../screens/waiter/WaiterDashboard';
import WaiterTablesScreen from '../screens/waiter/WaiterTablesScreen';
import TakeOrderScreen from '../screens/waiter/TakeOrderScreen';
import WaiterOrdersScreen from '../screens/waiter/WaiterOrdersScreen';
import ScanMenuScreen from '../screens/waiter/ScanMenuScreen';

// Admin Screens
import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminTablesScreen from '../screens/admin/AdminTablesScreen';
import AdminMenuScreen from '../screens/admin/AdminMenuScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminStaffScreen from '../screens/admin/AdminStaffScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: '🏠', Orders: '📋', Tables: '🪑', Menu: '🍽️', Profile: '👤',
  Dashboard: '📊', Staff: '👥',
};

function TabIcon({ name, focused }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{TAB_ICONS[name] || '📄'}</Text>
    </View>
  );
}

// Customer Tabs
function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Home" component={CustomerHomeScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} /> }} />
      <Tab.Screen name="Menu" component={MenuScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Menu" focused={focused} /> }} />
      <Tab.Screen name="Orders" component={OrderTrackingScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Orders" focused={focused} /> }} />
      <Tab.Screen name="Reservations" component={ReservationScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Reservations" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

// Waiter Tabs
function WaiterTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Dashboard" component={WaiterDashboard} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Dashboard" focused={focused} /> }} />
      <Tab.Screen name="Tables" component={WaiterTablesScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Tables" focused={focused} /> }} />
      <Tab.Screen name="Orders" component={WaiterOrdersScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Orders" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

// Admin Tabs
function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Dashboard" component={AdminDashboard} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Dashboard" focused={focused} /> }} />
      <Tab.Screen name="Tables" component={AdminTablesScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Tables" focused={focused} /> }} />
      <Tab.Screen name="Menu" component={AdminMenuScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Menu" focused={focused} /> }} />
      <Tab.Screen name="Orders" component={AdminOrdersScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Orders" focused={focused} /> }} />
      <Tab.Screen name="Staff" component={AdminStaffScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Staff" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

const tabOptions = ({ route }) => ({
  headerShown: false,
  tabBarStyle: {
    backgroundColor: '#0d0d0d',
    borderTopColor: 'rgba(255,255,255,0.07)',
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 10,
  },
  tabBarActiveTintColor: colors.green,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
});

export default function AppNavigator() {
  const { user, token, splashDone } = useSelector(state => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!splashDone ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : !token ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="OTP" component={OTPScreen} />
          </>
        ) : (
          <>
            {user?.role === 'customer' && <Stack.Screen name="CustomerMain" component={CustomerTabs} />}
            {user?.role === 'waiter' && <Stack.Screen name="WaiterMain" component={WaiterTabs} />}
            {(user?.role === 'restaurant_admin' || user?.role === 'super_admin') && <Stack.Screen name="AdminMain" component={AdminTabs} />}
            <Stack.Screen name="TakeOrder" component={TakeOrderScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="ScanMenu" component={ScanMenuScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
