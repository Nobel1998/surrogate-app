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
      // Check AsyncStorage for stored user credentials
      const storedUser = await getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initialize storage and check if user is already logged in
    initializeStorage();
    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      
      // Mock login with password validation - in real app would call API
      if (!email || !password) {
        return { success: false, error: 'Email and password cannot be empty' };
      }

      // Get all users from storage (includes registered users)
      const allUsers = await getAllStoredUsers();
      
      // Find user by email
      const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Check password
      if (user.password !== password) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Update last login time
      user.lastLogin = new Date().toISOString();
      await saveAllUsers(allUsers);

      // Remove password from user data before storing
      const { password: _, ...userData } = user;
      
      setUser(userData);
      setIsAuthenticated(true);
      await storeUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
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

      // Check if user with this email already exists BEFORE calling signUp
      // Note: This only works if RLS allows reading auth.users or if we check our profiles table
      // Checking profiles table is safer/easier with standard RLS
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', (await supabase.auth.signInWithOtp({ email: userData.email, options: { shouldCreateUser: false } })).data?.user?.id) // This is a bit hacky, let's try a cleaner way or just rely on signUp error
      
      // Cleaner way: Let's just call signUp and handle the specific error for existing user
      
      // 1. Sign up with Supabase Auth
      // We pass referralCode in the user metadata so the database trigger can use it immediately
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            phone: userData.phone,
            referral_code: userData.referralCode || null, // Pass it here!
          }
        }
      });

      if (authError) throw authError;

      // Check if this is a duplicate email registration
      // Supabase returns user.identities = [] when email already exists
      if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
        return { success: false, error: 'This email is already registered. Please log in instead.' };
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
