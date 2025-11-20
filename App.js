import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import EventScreen from './src/screens/EventScreen';
import BenefitsScreen from './src/screens/BenefitsScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AmbassadorScreen from './src/screens/AmbassadorScreen';
import ProtectionScreen from './src/screens/ProtectionScreen';
import CompanyScreen from './src/screens/CompanyScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ApplicationHistoryScreen from './src/screens/ApplicationHistoryScreen';
import SurrogateApplicationScreen from './src/screens/SurrogateApplicationScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import { AppProvider } from './src/context/AppContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Text, View } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main App Navigator with Tabs
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconEmoji;
          const iconSize = size * 0.6; // Very small icons to maximize text space
          switch (route.name) {
            case 'Community':
              iconEmoji = '👥';
              break;
            case 'Event':
              iconEmoji = '📅';
              break;
            case 'Benefits':
              iconEmoji = '🎁';
              break;
            case 'Register':
              iconEmoji = '📝';
              break;
            case 'Ambassador':
              iconEmoji = '🤝';
              break;
            case 'Protection':
              iconEmoji = '🛡️';
              break;
            case 'Company':
              iconEmoji = 'ℹ️';
              break;
            case 'Profile':
              iconEmoji = '👤';
              break;
            default:
              iconEmoji = '❓';
          }
          return <Text style={{ fontSize: iconSize, color: color }}>{iconEmoji}</Text>;
        },
        tabBarActiveTintColor: '#2A7BF6',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 3,
          paddingTop: 2,
          height: 78,
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: 7,
          fontWeight: '500',
          marginTop: -3,
          paddingHorizontal: 0,
          textAlign: 'center',
        },
        tabBarItemStyle: {
          paddingVertical: 0,
          paddingHorizontal: 0,
          minWidth: 0,
          flex: 1,
        },
      })}
    >
      <Tab.Screen 
        name="Community" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Community' }}
      />
      <Tab.Screen name="Event" component={EventScreen} />
      <Tab.Screen name="Benefits" component={BenefitsScreen} options={{ tabBarLabel: 'Benefits' }} />
      <Tab.Screen name="Register" component={RegisterScreen} />
      <Tab.Screen 
        name="Ambassador" 
        component={AmbassadorScreen}
        options={{ 
          tabBarLabel: ({ focused }) => (
            <Text 
              style={{
                fontSize: 6.5,
                fontWeight: '500',
                color: focused ? '#2A7BF6' : '#888',
                textAlign: 'center',
                includeFontPadding: false,
                textAlignVertical: 'center',
              }}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
            >
              Ambassador
            </Text>
          )
        }}
      />
      <Tab.Screen name="Protection" component={ProtectionScreen} />
      <Tab.Screen name="Company" component={CompanyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Auth Stack Navigator
function AuthStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Main App Stack Navigator
function AppStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="ApplicationHistory" component={ApplicationHistoryScreen} />
      <Stack.Screen name="SurrogateApplication" component={SurrogateApplicationScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    </Stack.Navigator>
  );
}

// Main App Component with Auth Logic
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FB' }}>
        <Text style={{ fontSize: 18, color: '#2A7BF6' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NotificationProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationProvider>
    </AppProvider>
  );
} 