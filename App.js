import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking } from 'react-native';
import AsyncStorageLib from './src/utils/Storage';
import HomeScreen from './src/screens/HomeScreen';
import EventScreen from './src/screens/EventScreen';
import BenefitsScreen from './src/screens/BenefitsScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AmbassadorScreen from './src/screens/AmbassadorScreen';
import ProtectionScreen from './src/screens/ProtectionScreen';
import CompanyScreen from './src/screens/CompanyScreen';
import ContactUsScreen from './src/screens/ContactUsScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ApplicationHistoryScreen from './src/screens/ApplicationHistoryScreen';
import SurrogateApplicationScreen from './src/screens/SurrogateApplicationScreen';
import IntendedParentApplicationScreen from './src/screens/IntendedParentApplicationScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import LandingScreen from './src/screens/LandingScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import MyMatchScreen from './src/screens/MyMatchScreen';
import MedicalReportFormScreen from './src/screens/MedicalReportFormScreen';
import IntendedParentsProfileScreen from './src/screens/IntendedParentsProfileScreen';
import CustomerServiceScreen from './src/screens/CustomerServiceScreen';
import FAQScreen from './src/screens/FAQScreen';
import MyInfoScreen from './src/screens/MyInfoScreen';
import LanguageScreen from './src/screens/LanguageScreen';
import SurrogateMedicalInfoScreen from './src/screens/SurrogateMedicalInfoScreen';
import ViewApplicationScreen from './src/screens/ViewApplicationScreen';
import OBAppointmentsScreen from './src/screens/OBAppointmentsScreen';
import IVFAppointmentsScreen from './src/screens/IVFAppointmentsScreen';
import { AppProvider } from './src/context/AppContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
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
            case 'My Journey':
              iconEmoji = '📖';
              break;
            case 'My Match':
              iconEmoji = '💝';
              break;
            case 'Blog':
              iconEmoji = '📰';
              break;
            case 'User Center':
              iconEmoji = '👤';
              break;
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
      <Tab.Screen name="My Journey" component={HomeScreen} />
      <Tab.Screen name="My Match" component={MyMatchScreen} />
      <Tab.Screen name="Blog" component={EventScreen} />
      <Tab.Screen name="User Center" component={ProfileScreen} />
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
          if (route.name === 'Blog') {
            iconEmoji = '📰';
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
      <Tab.Screen name="Blog" component={EventScreen} />
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
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="GuestTabs" component={GuestTabNavigator} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="EventDetailScreen" component={EventDetailScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
      <Stack.Screen name="SurrogateApplication" component={SurrogateApplicationScreen} />
      <Stack.Screen name="IntendedParentApplication" component={IntendedParentApplicationScreen} />
    </Stack.Navigator>
  );
}

// Main App Stack Navigator
function AppStackNavigator({ initialRouteName = 'MainTabs' }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="EventDetailScreen" component={EventDetailScreen} />
      <Stack.Screen name="ApplicationHistory" component={ApplicationHistoryScreen} />
      <Stack.Screen name="MedicalReportForm" component={MedicalReportFormScreen} />
      <Stack.Screen name="IntendedParentsProfile" component={IntendedParentsProfileScreen} />
      <Stack.Screen name="SurrogateApplication" component={SurrogateApplicationScreen} />
      <Stack.Screen name="IntendedParentApplication" component={IntendedParentApplicationScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="Benefits" component={BenefitsScreen} />
      <Stack.Screen name="Ambassador" component={AmbassadorScreen} />
      <Stack.Screen name="Protection" component={ProtectionScreen} />
      <Stack.Screen name="Company" component={CompanyScreen} />
      <Stack.Screen name="ContactUs" component={ContactUsScreen} />
      <Stack.Screen name="CustomerService" component={CustomerServiceScreen} />
      <Stack.Screen name="FAQ" component={FAQScreen} />
      <Stack.Screen name="MyInfo" component={MyInfoScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="SurrogateMedicalInfo" component={SurrogateMedicalInfoScreen} />
      <Stack.Screen name="ViewApplication" component={ViewApplicationScreen} options={{ title: 'My Application' }} />
      <Stack.Screen name="OBAppointments" component={OBAppointmentsScreen} />
      <Stack.Screen name="IVFAppointments" component={IVFAppointmentsScreen} />
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
          'My Journey': 'journey',
          'My Match': 'match',
          Blog: 'blog',
          'User Center': 'profile',
        },
      },
      PostDetail: 'post/:postId',
      GuestTabs: {
        screens: {
          Blog: 'blog',
        },
      },
      LoginScreen: 'login',
      RegisterScreen: 'register',
    },
  },
  // 添加深度链接处理的回调
  async getInitialURL() {
    // 检查是否有待处理的深度链接
    const url = await Linking.getInitialURL();
    console.log('🔗 Initial deep link URL:', url);
    return url;
  },
  subscribe(listener) {
    // 监听深度链接变化
    const onReceiveURL = ({ url }) => {
      console.log('🔗 Received deep link URL:', url);
      listener(url);
    };

    // 添加事件监听器
    const subscription = Linking.addEventListener('url', onReceiveURL);

    return () => {
      // 清理订阅
      subscription?.remove();
    };
  },
};

// Main App Component with Auth Logic
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [forceShowApp, setForceShowApp] = useState(false);
  const [resumeApplication, setResumeApplication] = useState(false);

  // 全局超时机制：如果加载超过30秒，强制显示App
  useEffect(() => {
    const globalTimeout = setTimeout(() => {
      if (isLoading) {
        console.log('⚠️ Global timeout reached, forcing app to show');
        setForceShowApp(true);
      }
    }, 30000); // 增加到30秒全局超时，给深度链接更多时间

    return () => clearTimeout(globalTimeout);
  }, [isLoading]);

  // Detect if we should resume the application flow after lazy signup
  const [resumeApplicationType, setResumeApplicationType] = useState(null);
  
  useEffect(() => {
    const checkResume = async () => {
      if (isAuthenticated) {
        const flag = await AsyncStorageLib.getItem('resume_application_flow');
        const appType = await AsyncStorageLib.getItem('resume_application_type');
        console.log('🔁 resume_application_flow flag (auth):', flag, 'type:', appType);
        
        if (flag === 'true' || flag === 'intended_parent') {
          setResumeApplication(true);
          setResumeApplicationType(appType || 'surrogate'); // default to surrogate for backward compatibility
          await AsyncStorageLib.removeItem('resume_application_flow');
          await AsyncStorageLib.removeItem('resume_application_type');
          console.log('🧹 cleared resume_application_flow after consume');
        } else {
          setResumeApplication(false);
          setResumeApplicationType(null);
        }
      } else {
        console.log('🔁 resume_application_flow cleared (not authenticated)');
        setResumeApplication(false);
        setResumeApplicationType(null);
        await AsyncStorageLib.removeItem('resume_application_flow');
        await AsyncStorageLib.removeItem('resume_application_type');
      }
    };
    checkResume();
  }, [isAuthenticated]);

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

  const navKey = isAuthenticated
    ? (resumeApplication ? 'auth-resume' : 'auth-nav')
    : 'guest-nav';

  // Determine initial route based on resume application type
  const getInitialRoute = () => {
    if (resumeApplication) {
      if (resumeApplicationType === 'intended_parent') {
        return 'IntendedParentApplication';
      }
      return 'SurrogateApplication'; // default to surrogate
    }
    return 'MainTabs';
  };

  return (
    <NavigationContainer linking={linking} key={navKey}>
      {isAuthenticated ? (
        <AppStackNavigator initialRouteName={getInitialRoute()} />
      ) : (
        <GuestStackNavigator />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppProvider>
        <NotificationProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </NotificationProvider>
      </AppProvider>
    </LanguageProvider>
  );
} 