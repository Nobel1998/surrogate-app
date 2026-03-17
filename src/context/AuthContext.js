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

  const buildUserDataFromSession = (sessionUser, profileData = null, fallbackEmail = '') => {
    const email = sessionUser?.email || fallbackEmail || '';
    const metadata = sessionUser?.user_metadata || {};
    const transferDate = (profileData?.transfer_date || '').trim() ||
      (metadata?.transfer_date || '').trim() ||
      '';
    const transferEmbryoDay = (profileData?.transfer_embryo_day || '').trim() ||
      (metadata?.transfer_embryo_day || '').trim() ||
      '';

    return {
      id: sessionUser?.id || '',
      email,
      name: profileData?.name || metadata?.name || (email.includes('@') ? email.split('@')[0] : 'User'),
      phone: profileData?.phone || metadata?.phone || '',
      address: profileData?.location || metadata?.location || '',
      dateOfBirth: profileData?.date_of_birth || metadata?.date_of_birth || '',
      race: profileData?.race || metadata?.race || '',
      inviteCode: profileData?.invite_code || '',
      referredBy: profileData?.referred_by || '',
      role: profileData?.role || metadata?.role || 'surrogate',
      location: profileData?.location || metadata?.location || '',
      transfer_date: transferDate,
      transfer_embryo_day: transferEmbryoDay,
      createdAt: sessionUser?.created_at || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      user_metadata: metadata,
    };
  };

  const checkAuthStatus = async (retryCount = 0) => {
    const maxRetries = 0;
    try {
      console.log(`🔍 Checking auth status... (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // 根据重试次数调整超时时间
      const timeoutDuration = 10000 + (retryCount * 5000); // 10s (single try)
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
            console.log('📱 Found stored user, keeping them logged in for offline access or manual retry');
            setUser(storedUser);
            setIsAuthenticated(true);
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
          console.log('🔍 Fetching profile for user:', session.user.id);
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
        const { data: profileData, error: profileError } = await Promise.race([
          profilePromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 10000))
        ]);
          
          if (profileError) {
            if (profileError.code === 'PGRST116') {
              // PGRST116 means no rows returned, which is OK for new users
              console.log('ℹ️ No profile found (new user)');
            } else {
              console.error('❌ Profile fetch error:', profileError);
            }
          }
          
          console.log('📥 Fetched profile data:', {
            transfer_date: profileData?.transfer_date,
            transfer_embryo_day: profileData?.transfer_embryo_day,
            hasProfileData: !!profileData,
            profileDataKeys: profileData ? Object.keys(profileData) : [],
            profileError: profileError?.message,
          });
          
          // Extract transfer_date and transfer_embryo_day with proper fallback
          const transferDate = (profileData?.transfer_date || '').trim() || 
                              (session.user.user_metadata?.transfer_date || '').trim() || 
                              '';
          const transferEmbryoDay = (profileData?.transfer_embryo_day || '').trim() || 
                                   (session.user.user_metadata?.transfer_embryo_day || '').trim() || 
                                   '';
          
          console.log('🔍 Extracted values:', {
            transferDate,
            transferEmbryoDay,
            fromProfile: !!profileData?.transfer_date,
            fromMetadata: !!session.user.user_metadata?.transfer_date,
            profileDataTransferDate: profileData?.transfer_date,
            profileDataTransferEmbryoDay: profileData?.transfer_embryo_day,
          });
          
          const userData = buildUserDataFromSession(session.user, {
            ...profileData,
            transfer_date: transferDate,
            transfer_embryo_day: transferEmbryoDay,
          });
          
          console.log('✅ User data prepared:', {
            transfer_date: userData.transfer_date,
            transfer_embryo_day: userData.transfer_embryo_day,
            userId: userData.id,
            userDataKeys: Object.keys(userData),
          });
          
          setUser(userData);
          setIsAuthenticated(true);
          await storeUser(userData);
          console.log('✅ User authenticated with Supabase session, user set:', {
            transfer_date: userData.transfer_date,
            transfer_embryo_day: userData.transfer_embryo_day,
          });
        } catch (profileError) {
          console.error('❌ Error fetching profile:', profileError);
          
          // Try to fetch just transfer_date and transfer_embryo_day as fallback
          let fallbackTransferDate = '';
          let fallbackTransferEmbryoDay = '';
          
          try {
            const { data: transferData } = await supabase
              .from('profiles')
              .select('transfer_date, transfer_embryo_day')
              .eq('id', session.user.id)
              .single();
            
            if (transferData) {
              fallbackTransferDate = (transferData.transfer_date || '').trim();
              fallbackTransferEmbryoDay = (transferData.transfer_embryo_day || '').trim();
              console.log('✅ Fallback fetch successful:', {
                transfer_date: fallbackTransferDate,
                transfer_embryo_day: fallbackTransferEmbryoDay,
              });
            }
          } catch (fallbackError) {
            console.warn('⚠️ Fallback fetch also failed:', fallbackError);
          }
          
          // 即使 profile 获取失败，也可以使用基本用户信息
          const basicUserData = buildUserDataFromSession(session.user, {
            transfer_date: fallbackTransferDate || session.user.user_metadata?.transfer_date || '',
            transfer_embryo_day: fallbackTransferEmbryoDay || session.user.user_metadata?.transfer_embryo_day || '',
          });
          
          console.log('✅ User data prepared (fallback):', {
            transfer_date: basicUserData.transfer_date,
            transfer_embryo_day: basicUserData.transfer_embryo_day,
            userId: basicUserData.id,
          });
          
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
          console.log('✅ Found stored user locally, keeping local session:', storedUser.email);
          setUser(storedUser);
          setIsAuthenticated(true);
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
      
      // Before forcing logout, check if user logged in manually
      try {
        const storedUser = await getStoredUser();
        if (storedUser) {
          console.log('✅ checkAuthStatus failed, but user logged in manually (found in storage). Skipping logout.');
          setUser(storedUser);
          setIsAuthenticated(true);
          return;
        }
      } catch (e) {}

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
    
    const emergencyTimeoutRef = { current: null };
    const fireEmergency = () => {
      console.log('🚨 Auth emergency timeout: forcing auth loading completion');
      setIsLoading(false);
    };

    // 先取 initialUrl，再决定应急超时时间：扫码/链接打开也使用标准超时，避免 auth 尚未恢复就提前结束加载态
    const checkDeepLinkAndAuth = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        console.log('🔗 App opened with URL:', initialUrl);
        const delayMs = initialUrl ? 12000 : 12000;
        emergencyTimeoutRef.current = setTimeout(fireEmergency, delayMs);

        if (initialUrl) {
          console.log('📱 App opened via link/QR, using standard loading timeout (12s)');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        await checkAuthStatus();
        if (emergencyTimeoutRef.current) clearTimeout(emergencyTimeoutRef.current);
      } catch (error) {
        console.error('Error checking deep link:', error);
        emergencyTimeoutRef.current = setTimeout(fireEmergency, 12000);
        await checkAuthStatus();
        if (emergencyTimeoutRef.current) clearTimeout(emergencyTimeoutRef.current);
      }
    };

    checkDeepLinkAndAuth();
    return () => { if (emergencyTimeoutRef.current) clearTimeout(emergencyTimeoutRef.current); };
  }, []);

  useEffect(() => {
    // 监听 Supabase 认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          try {
            // Fast path: authenticate immediately with metadata to avoid blocking on profile fetch.
            const basicUserData = buildUserDataFromSession(session.user);
            setUser(basicUserData);
            setIsAuthenticated(true);
            await storeUser(basicUserData);
            console.log('✅ User authenticated via auth state change (fast path)');

            // Best-effort profile enrichment with timeout.
            const profilePromise = supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            const { data: profileData, error: profileError } = await Promise.race([
              profilePromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Auth state profile timeout')), 8000)),
            ]);

            if (!profileError && profileData) {
              const enrichedUserData = buildUserDataFromSession(session.user, profileData);
              setUser(enrichedUserData);
              await storeUser(enrichedUserData);
              console.log('✅ User profile enriched via auth state change');
            } else if (profileError) {
              console.log('⚠️ Auth state profile fetch skipped:', profileError.message);
            }
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
        const authStartTime = Date.now();
        const loginPromise = supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password: password,
        });

        const { data: authData, error: authError } = await Promise.race([
          loginPromise,
          loginTimeout
        ]);
        const authEndTime = Date.now();

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

        // Fast path: do not block login on profile query.
        const basicUserData = buildUserDataFromSession(authData.user, null, email);
        setUser(basicUserData);
        setIsAuthenticated(true);
        await storeUser(basicUserData);
        console.log('✅ Login fast path user set');

        // Fetch user profile from profiles table with timeout
        const profileTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Profile loading timeout. Please try again.')), 10000);
        });

        let profileData = null;
        try {
          const profileStartTime = Date.now();
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          const { data, error: profileError } = await Promise.race([
            profilePromise,
            profileTimeout
          ]);
          const profileEndTime = Date.now();

          if (profileError) {
            console.log('⚠️ Profile fetch failed, using basic user data:', profileError.message);
          } else {
            profileData = data;
            console.log('✅ Profile data fetched successfully');
          }
        } catch (profileError) {
          console.log('⚠️ Profile fetch timed out, using basic user data');
        }

        // Extract transfer_date and transfer_embryo_day with proper fallback
        const transferDate = (profileData?.transfer_date || '').trim() ||
                            (authData.user.user_metadata?.transfer_date || '').trim() ||
                            '';
        const transferEmbryoDay = (profileData?.transfer_embryo_day || '').trim() ||
                                 (authData.user.user_metadata?.transfer_embryo_day || '').trim() ||
                                 '';
        
        console.log('🔍 Login - Extracted transfer data:', {
          transferDate,
          transferEmbryoDay,
          fromProfile: !!profileData?.transfer_date,
          fromMetadata: !!authData.user.user_metadata?.transfer_date,
          profileDataTransferDate: profileData?.transfer_date,
        });
        
        const userData = buildUserDataFromSession(authData.user, {
          ...profileData,
          transfer_date: transferDate,
          transfer_embryo_day: transferEmbryoDay,
        }, email);
        
        console.log('✅ Login - User data prepared:', {
          transfer_date: userData.transfer_date,
          transfer_embryo_day: userData.transfer_embryo_day,
          userId: userData.id,
        });
        
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
      if (user && user.id) {
        // Update Supabase profiles table first
        const { data: updatedProfileData, error: updateError } = await supabase
          .from('profiles')
          .update(updatedData)
          .eq('id', user.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating profile in Supabase:', updateError);
          return { success: false, error: updateError.message || 'Failed to update profile in database' };
        }
        
        console.log('✅ Profile updated in Supabase:', updatedProfileData);
        
        // If transfer_date is being updated, also update surrogate_matches table
        if (updatedData.transfer_date !== undefined) {
          // Find match for this surrogate (try active first, then any match)
          let match = null;
          let matchError = null;
          
          // First, try to find active match
          const { data: activeMatch, error: activeMatchError } = await supabase
            .from('surrogate_matches')
            .select('id, status')
            .eq('surrogate_id', user.id)
            .eq('status', 'active')
            .maybeSingle();
          
          if (activeMatch && !activeMatchError) {
            match = activeMatch;
          } else {
            // If no active match, try to find any match (most recent)
            const { data: anyMatch, error: anyMatchError } = await supabase
              .from('surrogate_matches')
              .select('id, status')
              .eq('surrogate_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (anyMatch && !anyMatchError) {
              match = anyMatch;
            } else {
              matchError = anyMatchError || activeMatchError;
            }
          }
          
          if (match && !matchError) {
            // Update the match's transfer_date
            const { error: matchUpdateError } = await supabase
              .from('surrogate_matches')
              .update({
                transfer_date: updatedData.transfer_date,
                updated_at: new Date().toISOString(),
              })
              .eq('id', match.id)
              .eq('surrogate_id', user.id);
            
            if (matchUpdateError) {
              console.error('⚠️ Failed to update transfer_date in surrogate_matches:', matchUpdateError);
            }
          }
        }
        
        // Merge updated data from Supabase with existing user data
        const updatedUser = {
          ...user,
          ...updatedData,
          // Also include any fields that might have been updated by Supabase triggers
          ...(updatedProfileData || {}),
        };
        
        // Update local state
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
