import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    
    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    try {
    const result = await login(email.trim(), password);
    
    if (result.success) {
        // Optional: You might not need an alert here if the app auto-redirects on auth state change
        // But keeping it for feedback is fine
    } else {
      Alert.alert('Login Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
      console.error('Login error:', error);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('RegisterScreen');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your surrogacy account</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
                placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                  placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.registerButton} onPress={navigateToRegister}>
            <Text style={styles.registerButtonText}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By signing in, you agree to our{'\n'}
            <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff', // 改为纯白背景，更干净
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: '800', // Extra Bold
    color: '#1A1D1E',
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#6E7191',
    fontWeight: '500',
    lineHeight: 26,
  },
  form: {
    backgroundColor: '#fff',
    // 移除卡片样式，直接在背景上显示，更现代
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 10,
    textTransform: 'uppercase', // 全大写标签，增加设计感
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 0,
    borderBottomWidth: 2, // 只有底部边框
    borderBottomColor: '#F5F7FA',
    paddingHorizontal: 0, // 左对齐无内边距
    paddingVertical: 16,
    fontSize: 18,
    backgroundColor: 'transparent',
    color: '#1A1D1E',
    fontWeight: '500',
  },
  passwordContainer: {
    position: 'relative',
    borderBottomWidth: 2,
    borderBottomColor: '#F5F7FA',
  },
  passwordInput: {
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 16,
    paddingRight: 50,
    fontSize: 18,
    backgroundColor: 'transparent',
    color: '#1A1D1E',
    fontWeight: '500',
    width: '100%',
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    top: 14,
    padding: 4,
  },
  eyeText: {
    fontSize: 20,
    opacity: 0.5,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordText: {
    color: '#6E7191',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#2A7BF6',
    borderRadius: 16, // 更大的圆角
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2A7BF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#A0A3BD',
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F5F7FA',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#A0A3BD',
    fontSize: 14,
    fontWeight: '500',
  },
  registerButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  registerButtonText: {
    color: '#2A7BF6',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    color: '#A0A3BD',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    color: '#1A1D1E', // 链接颜色改深色
    fontWeight: '600',
    textDecorationLine: 'none', // 移除下划线
  },
});
