import React, { useState, useEffect } from 'react';
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
import PostDetailScreen from './src/screens/PostDetailScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import { AppProvider } from './src/context/AppContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Text, View, ActivityIndicator } from 'react-native';

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
            case 'Apply':
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
        tabBarInactiveTintColor: '#A0A3BD', // 更高级的灰色
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 20, // 增加底部 padding，适应 iPhone X+
          paddingTop: 12,
          height: 88, // 更高
          backgroundColor: '#fff',
          borderTopWidth: 0, // 移除顶部边框
          elevation: 10, // Android 阴影
          shadowColor: '#000', // iOS 阴影
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          paddingHorizontal: 10, // 增加水平内边距，防止贴边
        },
        tabBarLabel: ({ focused, color, children }) => (
          <Text 
            style={{
              fontSize: 9,
              fontWeight: '600',
              color: color,
          textAlign: 'center',
              marginTop: 4,
              width: '100%',
            }}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.7}
          >
            {children}
          </Text>
        ),
        tabBarItemStyle: {
          paddingVertical: 0,
          paddingHorizontal: 0,
          minWidth: 0,
          flex: 1,
        },
      })}
    >
      <Tab.Screen name="Community" component={HomeScreen} />
      <Tab.Screen name="Event" component={EventScreen} />
      <Tab.Screen name="Benefits" component={BenefitsScreen} />
      <Tab.Screen name="Apply" component={SurrogateApplicationScreen} />
      <Tab.Screen name="Ambassador" component={AmbassadorScreen} />
      <Tab.Screen name="Protection" component={ProtectionScreen} />
      <Tab.Screen name="Company" component={CompanyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Dummy component for the Login tab
const LoginTabPlaceholder = () => <View style={{ flex: 1, backgroundColor: '#fff' }} />;

// Guest Tab Navigator for unauthenticated users
function GuestTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconEmoji;
          const iconSize = size * 0.8;
          if (route.name === 'Event') {
            iconEmoji = '📅';
          } else if (route.name === 'LoginTab') {
            iconEmoji = '🔑';
          }
          return <Text style={{ fontSize: iconSize, color: color }}>{iconEmoji}</Text>;
        },
        tabBarActiveTintColor: '#2A7BF6',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Event" component={EventScreen} />
      <Tab.Screen 
        name="LoginTab" 
        component={LoginTabPlaceholder}
        options={{ tabBarLabel: 'Log In' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('LoginScreen'); // Navigate to the Stack Screen
          },
        })}
      />
    </Tab.Navigator>
  );
}

// Guest Stack Navigator
function GuestStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GuestTabs" component={GuestTabNavigator} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Main App Stack Navigator
function AppStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="EventDetailScreen" component={EventDetailScreen} />
      <Stack.Screen name="ApplicationHistory" component={ApplicationHistoryScreen} />
      <Stack.Screen name="SurrogateApplication" component={SurrogateApplicationScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    </Stack.Navigator>
  );
}

// Deep Link configuration
const linking = {
  prefixes: ['surrogateagency://', 'https://surrogateagency.app'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Community: 'community',
          Event: 'events',
        },
      },
      PostDetail: 'post/:postId',
      GuestTabs: {
        screens: {
          Event: 'events',
        },
      },
      LoginScreen: 'login',
      RegisterScreen: 'register',
    },
  },
};

// Main App Component with Auth Logic
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [forceShowApp, setForceShowApp] = useState(false);

  // 全局超时机制：如果加载超过15秒，强制显示App
  useEffect(() => {
    const globalTimeout = setTimeout(() => {
      if (isLoading) {
        console.log('⚠️ Global timeout reached, forcing app to show');
        setForceShowApp(true);
      }
    }, 15000); // 15秒全局超时

    return () => clearTimeout(globalTimeout);
  }, [isLoading]);

  // 如果还在加载且没有达到强制显示条件，显示加载界面
  if (isLoading && !forceShowApp) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FB' }}>
        <ActivityIndicator size="large" color="#2A7BF6" />
        <Text style={{ fontSize: 18, color: '#2A7BF6', marginTop: 16 }}>Loading...</Text>
        <Text style={{ fontSize: 14, color: '#6E7191', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          Connecting to server...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {isAuthenticated ? <AppStackNavigator /> : <GuestStackNavigator />}
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