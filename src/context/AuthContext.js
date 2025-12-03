import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorageLib from '../utils/Storage';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock user database - in real app would be in database
const mockUsers = [
  {
    id: '1',
    email: 'demo@example.com',
    password: 'password123',
    name: 'Demo User',
    phone: '+1-555-0123',
    address: '123 Main St, City, State 12345',
    dateOfBirth: '1990-01-01',
    emergencyContact: 'Emergency Contact: +1-555-0124',
    medicalHistory: 'No significant medical history',
    preferences: {
      notifications: true,
      emailUpdates: true,
      smsUpdates: false,
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'test@surrogacy.com',
    password: 'surrogacy2024',
    name: 'Test Surrogate',
    phone: '+1-555-0125',
    address: '456 Oak Ave, City, State 12345',
    dateOfBirth: '1988-05-15',
    emergencyContact: 'Emergency Contact: +1-555-0126',
    medicalHistory: 'Previous pregnancy experience',
    preferences: {
      notifications: true,
      emailUpdates: true,
      smsUpdates: true,
    },
    createdAt: '2024-01-15T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  }
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const getStoredUser = async () => {
    try {
      const storedUserJson = await AsyncStorageLib.getItem('current_user');
      if (storedUserJson) {
        return JSON.parse(storedUserJson);
      }
      return null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  };

  const storeUser = async (userData) => {
    try {
      await AsyncStorageLib.setItem('current_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error storing user:', error);
    }
  };

  const getAllStoredUsers = async () => {
    try {
      const usersJson = await AsyncStorageLib.getItem('all_users');
      if (usersJson) {
        return JSON.parse(usersJson);
      }
      return mockUsers; // Return initial mock users if no stored users
    } catch (error) {
      console.error('Error getting all users:', error);
      return mockUsers;
    }
  };

  const saveAllUsers = async (users) => {
    try {
      await AsyncStorageLib.setItem('all_users', JSON.stringify(users));
    } catch (error) {
      console.error('Error saving all users:', error);
    }
  };

  const initializeStorage = async () => {
    try {
      // Initialize with mock users if no users are stored
      const existingUsers = await AsyncStorageLib.getItem('all_users');
      if (!existingUsers) {
        await saveAllUsers(mockUsers);
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking auth status...');
      
      // Supabase 连接已验证正常
      
      // 添加超时机制，防止无限加载
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth check timeout')), 8000); // 8秒超时（增加时间）
      });
      
      // 首先检查 Supabase 会话
      const sessionPromise = supabase.auth.getSession();
      
      const { data: { session }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]);
      
      if (error) {
        console.error('🚨 Supabase session error details:', {
          message: error.message,
          status: error.status,
          statusCode: error.statusCode,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        if (error.message === 'Auth check timeout') {
          console.log('⏱️ Auth check timed out - checking local storage');
          // 超时时，检查本地存储的用户
          const storedUser = await getStoredUser();
          if (storedUser) {
            console.log('📱 Found stored user, will require re-login for cloud sync');
            // 有本地用户但没有云端会话，清除本地用户强制重新登录
            setUser(null);
            setIsAuthenticated(false);
            await AsyncStorageLib.removeItem('current_user');
          } else {
            console.log('❌ No stored user found');
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          console.error('Error getting Supabase session:', error);
          setUser(null);
          setIsAuthenticated(false);
        }
        setIsLoading(false);
        return;
      }
      
      console.log('Session check result:', session ? 'Session found' : 'No session', error ? `Error: ${error.message}` : '');
      
      if (session?.user) {
        // Supabase 会话存在，使用它
        console.log('✅ Supabase session found, user:', session.user.email);
        
        try {
          // Fetch user profile with timeout
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          const { data: profileData } = await Promise.race([
            profilePromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 5000))
          ]);
          
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email.split('@')[0],
            phone: session.user.user_metadata?.phone || '',
            inviteCode: profileData?.invite_code || '',
            referredBy: profileData?.referred_by || '',
            createdAt: session.user.created_at,
            lastLogin: new Date().toISOString(),
          };
          
          setUser(userData);
          setIsAuthenticated(true);
          await storeUser(userData);
          console.log('✅ User authenticated with Supabase session');
        } catch (profileError) {
          console.error('Error fetching profile:', profileError);
          // 即使 profile 获取失败，也可以使用基本用户信息
          const basicUserData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email.split('@')[0],
            phone: session.user.user_metadata?.phone || '',
            inviteCode: '',
            referredBy: '',
            createdAt: session.user.created_at,
            lastLogin: new Date().toISOString(),
          };
          
          setUser(basicUserData);
          setIsAuthenticated(true);
          await storeUser(basicUserData);
          console.log('✅ User authenticated with basic session data');
        }
      } else {
        // 没有 Supabase 会话
        console.log('⚠️ No Supabase session found');
        const storedUser = await getStoredUser();
        if (storedUser) {
          console.log('Found stored user locally:', storedUser.email);
          console.log('⚠️ User will need to re-login to create Supabase session');
          // 清除本地用户，强制重新登录
          setUser(null);
          setIsAuthenticated(false);
          await AsyncStorageLib.removeItem('current_user');
        } else {
          // 没有本地用户，设置为未认证状态
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      if (error.message === 'Auth check timeout') {
        console.log('⏱️ Auth check timed out - this is normal for slow connections');
      } else {
        console.error('Error checking auth status:', error);
      }
      // 发生错误时，设置为未认证状态，让用户可以重新登录
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initialize storage and check if user is already logged in
    initializeStorage();
    checkAuthStatus();
    
    // 监听 Supabase 认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email.split('@')[0],
            phone: session.user.user_metadata?.phone || '',
            inviteCode: profileData?.invite_code || '',
            referredBy: profileData?.referred_by || '',
            createdAt: session.user.created_at,
            lastLogin: new Date().toISOString(),
          };
          
          setUser(userData);
          setIsAuthenticated(true);
          await storeUser(userData);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        await AsyncStorageLib.removeItem('current_user');
      }
    });
    
    // 清理订阅
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      
      if (!email || !password) {
        return { success: false, error: 'Email and password cannot be empty' };
      }

      console.log('🔐 Starting login process for:', email);

      // Supabase 连接已验证正常

      // 添加登录超时机制
      const loginTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Login timeout')), 15000); // 15秒超时
      });

      // Use Supabase Auth to sign in with timeout
      console.log('🔑 Attempting Supabase authentication...');
      const loginPromise = supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });

      const { data: authData, error: authError } = await Promise.race([
        loginPromise,
        loginTimeout
      ]);

      if (authError) {
        console.error('🚨 Detailed Supabase login error:', {
          message: authError.message,
          status: authError.status,
          statusCode: authError.statusCode,
          details: authError.details,
          hint: authError.hint,
          code: authError.code,
          name: authError.name
        });
        
        if (authError.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password' };
        }
        if (authError.message.includes('Email not confirmed')) {
          return { success: false, error: 'Please check your email and confirm your account' };
        }
        if (authError.status === 400) {
          return { success: false, error: 'Invalid request. Please check your credentials.' };
        }
        if (authError.status === 401) {
          return { success: false, error: 'Authentication failed. Please check your email and password.' };
        }
        if (authError.status === 429) {
          return { success: false, error: 'Too many login attempts. Please wait and try again.' };
        }
        return { success: false, error: `Login failed: ${authError.message}` };
      }

      if (!authData.user) {
        return { success: false, error: 'Login failed, please try again' };
      }

      console.log('✅ Supabase login successful');

      // Fetch user profile from profiles table with timeout
      const profileTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000); // 5秒超时
      });

      let profileData = null;
      try {
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        const { data, error: profileError } = await Promise.race([
          profilePromise,
          profileTimeout
        ]);

        if (profileError) {
          console.log('⚠️ Profile fetch failed, using basic user data:', profileError.message);
        } else {
          profileData = data;
          console.log('✅ Profile data fetched successfully');
        }
      } catch (profileError) {
        console.log('⚠️ Profile fetch timed out, using basic user data');
      }

      // Construct user data
      const userData = {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.name || email.split('@')[0],
        phone: authData.user.user_metadata?.phone || '',
        inviteCode: profileData?.invite_code || '',
        referredBy: profileData?.referred_by || '',
        createdAt: authData.user.created_at,
        lastLogin: new Date().toISOString(),
      };
      
      setUser(userData);
      setIsAuthenticated(true);
      await storeUser(userData);
      
      console.log('🎉 Login completed successfully');
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      if (error.message === 'Login timeout') {
        return { success: false, error: 'Login timed out. Please check your internet connection and try again.' };
      }
      return { success: false, error: 'Login failed, please try again' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      
      if (!userData.email || !userData.password) {
        return { success: false, error: 'Email and password are required' };
      }

      // 1. Sign up with Supabase Auth
      // We pass referralCode in the user metadata so the database trigger can use it immediately
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            phone: userData.phone,
            referral_code: userData.referralCode || null,
          }
        }
      });

      if (authError) {
        // Check for specific duplicate email error
        if (authError.message && (authError.message.includes('already registered') || authError.message.includes('User already registered'))) {
          return { success: false, error: 'This email is already registered. Please login instead.' };
        }
        throw authError;
      }

      // CRITICAL: Check if this is truly a new registration
      // If user already exists, Supabase returns user data but:
      // - authData.user.identities will be an empty array []
      // - authData.session will be null
      if (!authData.user) {
        return { success: false, error: 'Registration failed. Please try again.' };
      }

      // Check if this is a duplicate signup attempt (user exists)
      if (authData.user.identities && authData.user.identities.length === 0) {
        return { success: false, error: 'This email is already registered. Please login instead.' };
      }

      // Additional check: if we have a user but no session, it might be a duplicate or email confirmation pending
      if (!authData.session) {
        // This could be either:
        // 1. Email confirmation is required (legitimate new user)
        // 2. User already exists (duplicate)
        // Let's check the created_at timestamp - if it's old, it's likely a duplicate
        const userCreatedAt = new Date(authData.user.created_at);
        const now = new Date();
        const timeDiff = now - userCreatedAt;
        
        // If user was created more than 10 seconds ago, it's likely an existing user
        if (timeDiff > 10000) {
          return { success: false, error: 'This email is already registered. Please login instead.' };
        }
      }

      if (authData.user) {
        // 2. Fetch the full profile including the generated invite_code
        // We no longer need to manually update referred_by here because the trigger will handle it
        // But we might need a small delay to ensure the trigger has finished inserting the row
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        // 4. Construct the user object for local state
        const newUser = {
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          phone: userData.phone || '',
          address: userData.address || '',
          dateOfBirth: userData.dateOfBirth || '',
          emergencyContact: userData.emergencyContact || '',
          inviteCode: profileData?.invite_code || '', // Get the generated code
          referredBy: profileData?.referred_by || '',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        
        setUser(newUser);
        setIsAuthenticated(true);
        await storeUser(newUser);
        
        // Keep the old local storage logic as a fallback/cache if you want
        // but primarily we rely on Supabase now for this session
        return { success: true, user: newUser };
      }
      
      return { success: false, error: 'Registration failed' };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'Registration failed, please try again' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      setUser(null);
      setIsAuthenticated(false);
      // Clear stored user credentials
      await AsyncStorageLib.removeItem('current_user');
      console.log('User logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (updatedData) => {
    try {
      if (user) {
        const updatedUser = { ...user, ...updatedData };
        setUser(updatedUser);
        await storeUser(updatedUser);
        return { success: true, user: updatedUser };
      }
      return { success: false, error: 'User not logged in' };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Update failed, please try again' };
    }
  };

  const updatePreferences = async (preferences) => {
    try {
      if (user) {
        const updatedUser = {
          ...user,
          preferences: { ...user.preferences, ...preferences }
        };
        setUser(updatedUser);
        await storeUser(updatedUser);
        return { success: true, user: updatedUser };
      }
      return { success: false, error: 'User not logged in' };
    } catch (error) {
      console.error('Update preferences error:', error);
      return { success: false, error: 'Update failed, please try again' };
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    updatePreferences,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
