import React, { createContext, useContext, useState, useEffect } from 'react';
import { Linking } from 'react-native';
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

  const checkAuthStatus = async (retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      console.log(`🔍 Checking auth status... (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // 首先进行网络连接测试
      if (retryCount === 0) {
        try {
          console.log('🌐 Testing network connectivity...');
          const networkTest = await fetch('https://www.google.com', { 
            method: 'HEAD',
            timeout: 5000 
          });
          console.log('✅ Network connectivity confirmed');
        } catch (networkError) {
          console.log('⚠️ Network connectivity issue detected:', networkError.message);
        }
      }
      
      // 根据重试次数调整超时时间
      const timeoutDuration = 15000 + (retryCount * 10000); // 15s, 25s, 35s
      console.log(`⏱️ Using timeout duration: ${timeoutDuration}ms`);
      
      // 添加超时机制，防止无限加载
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth check timeout')), timeoutDuration);
      });
      
      // 首先检查 Supabase 会话
      console.log('🔑 Requesting Supabase session...');
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
          console.log('⏱️ Auth check timed out');
          
          // 如果还有重试次数，进行重试
          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying auth check in 2 seconds... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return checkAuthStatus(retryCount + 1);
          }
          
          console.log('⏱️ All auth check attempts timed out - checking local storage');
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
          
          // 对于其他错误，也尝试重试
          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying auth check due to error in 2 seconds... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return checkAuthStatus(retryCount + 1);
          }
          
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
            name: profileData?.name || session.user.user_metadata?.name || session.user.email.split('@')[0],
            phone: profileData?.phone || session.user.user_metadata?.phone || '',
            address: profileData?.location || session.user.user_metadata?.location || '',
            dateOfBirth: profileData?.date_of_birth || session.user.user_metadata?.date_of_birth || '',
            race: profileData?.race || session.user.user_metadata?.race || '',
            inviteCode: profileData?.invite_code || '',
            referredBy: profileData?.referred_by || '',
            role: profileData?.role || session.user.user_metadata?.role || 'surrogate',
            location: profileData?.location || session.user.user_metadata?.location || '',
            createdAt: session.user.created_at,
            lastLogin: new Date().toISOString(),
            // Include raw user_metadata for application form fields (age, hear_about_us)
            user_metadata: session.user.user_metadata || {},
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
            address: session.user.user_metadata?.location || '',
            dateOfBirth: session.user.user_metadata?.date_of_birth || '',
            race: session.user.user_metadata?.race || '',
            inviteCode: '',
            referredBy: '',
            role: session.user.user_metadata?.role || 'surrogate',
            location: session.user.user_metadata?.location || '',
            createdAt: session.user.created_at,
            lastLogin: new Date().toISOString(),
            // Include raw user_metadata for application form fields (age, hear_about_us)
            user_metadata: session.user.user_metadata || {},
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
        console.log('⏱️ Auth check timed out');
        
        // 如果还有重试次数，进行重试
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying auth check due to timeout in 3 seconds... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          return checkAuthStatus(retryCount + 1);
        }
        
        console.log('⏱️ All auth check attempts timed out');
      } else {
        console.error('Error checking auth status:', error);
        
        // 对于其他错误，也尝试重试
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying auth check due to error in 3 seconds... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          return checkAuthStatus(retryCount + 1);
        }
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
    
    // 检查是否是通过深度链接打开的app
    const checkDeepLinkAndAuth = async () => {
      try {
        // 检查初始URL
        const initialUrl = await Linking.getInitialURL();
        console.log('🔗 App opened with URL:', initialUrl);
        
        if (initialUrl) {
          console.log('📱 App opened via deep link, adjusting auth check strategy');
          // 如果是通过深度链接打开，给更多时间进行认证检查
          await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒让深度链接处理完成
        }
        
        // 进行认证状态检查
        checkAuthStatus();
      } catch (error) {
        console.error('Error checking deep link:', error);
        // 即使深度链接检查失败，也要进行认证检查
        checkAuthStatus();
      }
    };
    
    checkDeepLinkAndAuth();
    
    // 监听 Supabase 认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            const userData = {
              id: session.user.id,
              email: session.user.email,
              name: profileData?.name || session.user.user_metadata?.name || session.user.email.split('@')[0],
              phone: profileData?.phone || session.user.user_metadata?.phone || '',
              address: profileData?.location || session.user.user_metadata?.location || '',
              dateOfBirth: profileData?.date_of_birth || session.user.user_metadata?.date_of_birth || '',
              race: profileData?.race || session.user.user_metadata?.race || '',
              inviteCode: profileData?.invite_code || '',
              referredBy: profileData?.referred_by || '',
              role: profileData?.role || session.user.user_metadata?.role || 'surrogate',
              location: profileData?.location || session.user.user_metadata?.location || '',
              createdAt: session.user.created_at,
              lastLogin: new Date().toISOString(),
              // Include raw user_metadata for application form fields (age, hear_about_us)
              user_metadata: session.user.user_metadata || {},
            };
            
            setUser(userData);
            setIsAuthenticated(true);
            await storeUser(userData);
            console.log('✅ User authenticated via auth state change');
          } catch (error) {
            console.error('Error in auth state change handler:', error);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        await AsyncStorageLib.removeItem('current_user');
        console.log('🚪 User signed out via auth state change');
      }
    });
    
    // 清理订阅
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        setIsLoading(true);
        attempts++;
        
        if (!email || !password) {
          return { success: false, error: 'Email and password cannot be empty' };
        }

        console.log(`🔐 Starting login attempt ${attempts}/${maxAttempts} for:`, email);

        // 添加登录超时机制 - 增加到60秒以适应慢网络
        const loginTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Login timeout. Please check your internet connection and try again.')), 60000); // 60秒超时
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
          
          // 这些错误不需要重试
          if (authError.message.includes('Invalid login credentials') ||
              authError.message.includes('Email not confirmed') ||
              authError.status === 401) {
            return { 
              success: false, 
              error: authError.message.includes('Invalid login credentials') 
                ? 'Invalid email or password' 
                : authError.message 
            };
          }
          
          // 网络或服务器错误，可能需要重试
          if (attempts < maxAttempts) {
            console.log(`⏳ Login attempt ${attempts} failed, retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          return { success: false, error: `Login failed after ${maxAttempts} attempts: ${authError.message}` };
        }

        if (!authData.user) {
          if (attempts < maxAttempts) {
            console.log(`⏳ No user data received, retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          return { success: false, error: 'Login failed, please try again' };
        }

        console.log('✅ Supabase login successful');

        // Fetch user profile from profiles table with timeout - 增加到30秒
        const profileTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Profile loading timeout. Please try again.')), 30000); // 30秒超时
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
          name: profileData?.name || authData.user.user_metadata?.name || email.split('@')[0],
          phone: profileData?.phone || authData.user.user_metadata?.phone || '',
          address: profileData?.location || authData.user.user_metadata?.location || '',
          dateOfBirth: profileData?.date_of_birth || authData.user.user_metadata?.date_of_birth || '',
          race: profileData?.race || authData.user.user_metadata?.race || '',
          inviteCode: profileData?.invite_code || '',
          referredBy: profileData?.referred_by || '',
          role: profileData?.role || authData.user.user_metadata?.role || 'surrogate',
          location: profileData?.location || authData.user.user_metadata?.location || '',
          createdAt: authData.user.created_at,
          lastLogin: new Date().toISOString(),
          // Include raw user_metadata for application form fields (age, hear_about_us)
          user_metadata: authData.user.user_metadata || {},
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        await storeUser(userData);
        
        console.log('🎉 Login completed successfully');
        return { success: true, user: userData };
        
      } catch (error) {
        console.error(`Login attempt ${attempts} error:`, error);
        
        if (error.message === 'Login timeout') {
          if (attempts < maxAttempts) {
            console.log(`⏳ Login timed out, retrying in 3 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          return { success: false, error: 'Login timed out after multiple attempts. Please check your internet connection.' };
        }
        
        if (attempts < maxAttempts) {
          console.log(`⏳ Unexpected error, retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        return { success: false, error: `Login failed after ${maxAttempts} attempts. Please try again later.` };
      } finally {
        setIsLoading(false);
      }
    }
    
    // 如果所有尝试都失败了
    return { success: false, error: `Unable to login after ${maxAttempts} attempts. Please check your connection and try again.` };
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      
      if (!userData.email || !userData.password) {
        return { success: false, error: 'Email and password are required' };
      }

      // 1. Sign up with Supabase Auth
      // We pass referralCode in the user metadata so the database trigger can use it immediately
      const role = (userData.role || 'surrogate').toLowerCase();

      console.log('📝 Register payload (sending to auth):', {
        email: userData.email,
        role,
        name: userData.name,
        phone: userData.phone,
        dateOfBirth: userData.dateOfBirth,
        race: userData.emergencyContact,
        location: userData.address,
        referralCode: userData.referralCode,
      });

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            phone: userData.phone,
            referral_code: userData.referralCode || null,
            role, // 写入 auth metadata
            date_of_birth: userData.dateOfBirth || null,
            race: userData.emergencyContact || null,
            location: userData.address || null,
          }
        }
      });

      console.log('✅ Auth signup result:', {
        userId: authData?.user?.id,
        hasSession: !!authData?.session,
        identities: authData?.user?.identities?.length,
        authError: authError?.message,
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
        // 2. Upsert profile with role
        await new Promise(resolve => setTimeout(resolve, 300)); // give DB trigger a moment

        // 2a. Upsert profile; invite_code 必须唯一且非空，重复时自动生成新 code 重试一次
        let profileData = null;
        let profileError = null;

        const generateInviteCode = () => {
          // 生成 6 位字母数字邀请码（大写）
          const chars = 'ABCDEFGHJKLMNOPQRSTUVWXYZ0123456789';
          let code = '';
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return code;
        };

        let inviteCodeToUse = generateInviteCode();

        const upsertProfile = async (inviteCode) => {
          const payload = {
            id: authData.user.id,
            role,
            name: userData.name,
            email: userData.email,
            phone: userData.phone || '',
            date_of_birth: userData.dateOfBirth || null,
            race: userData.emergencyContact || null,
            location: userData.address || '',
            invite_code: inviteCode,
            // referred_by: 填写他人邀请码则记录，否则允许为 null
            referred_by: userData.referralCode?.trim() || null,
          };
          console.log('🧾 Profile upsert payload:', payload);
          return supabase
            .from('profiles')
            .upsert(payload, { onConflict: 'id' })
            .select('*')
            .single();
        };

        ({ data: profileData, error: profileError } = await upsertProfile(inviteCodeToUse));

        if (profileError && profileError.message?.includes('profiles_invite_code_key')) {
          inviteCodeToUse = generateInviteCode();
          console.log('⚠️ Duplicate invite_code, retrying with new 6-char code:', inviteCodeToUse);
          ({ data: profileData, error: profileError } = await upsertProfile(inviteCodeToUse));
        }

        if (profileError) {
          console.log('⚠️ Upsert profiles failed (RLS?)', profileError.message);
        } else {
          console.log('✅ Profile upserted:', {
            id: profileData?.id,
            role: profileData?.role,
            name: profileData?.name,
            phone: profileData?.phone,
            date_of_birth: profileData?.date_of_birth,
            race: profileData?.race,
            location: profileData?.location,
            invite_code: profileData?.invite_code,
          });
        }

        // 4. Construct the user object for local state
          const newUser = {
            id: authData.user.id,
            email: userData.email,
            name: userData.name,
            phone: userData.phone || '',
            address: userData.address || '',
            dateOfBirth: userData.dateOfBirth || '',
            race: userData.emergencyContact || '',
            location: userData.address || '',
            inviteCode: profileData?.invite_code || '',
            referredBy: profileData?.referred_by || '',
            role: profileData?.role || role,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            // Include raw user_metadata for application form fields (age, hear_about_us)
            user_metadata: authData.user.user_metadata || {},
          };
        console.log('🏁 Local newUser constructed:', newUser);
        
        setUser(newUser);
        setIsAuthenticated(true);
        await storeUser(newUser);
        
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
      console.log('🚪 Starting logout process...');
      
      // Sign out from Supabase
      console.log('📤 Signing out from Supabase...');
      await supabase.auth.signOut();
      
      // Clear local state
      console.log('🧹 Clearing local state...');
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear stored user credentials
      console.log('💾 Clearing stored credentials...');
      await AsyncStorageLib.removeItem('current_user');
      
      // Also clear application cache to ensure fresh start
      await AsyncStorageLib.removeItem('user_applications');
      
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Even if there's an error, clear local state
      setUser(null);
      setIsAuthenticated(false);
      await AsyncStorageLib.removeItem('current_user');
      await AsyncStorageLib.removeItem('user_applications');
      throw error; // Re-throw to let the UI handle the error
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
