import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen({ navigation }) {
  const { updatePassword, clearPasswordRecoveryPending } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) {
        setHasRecoverySession(!!session);
        if (!session) {
          Alert.alert(
            'Link incomplete',
            'The app opened from your email, but the reset session was missing (common when iOS strips the link token). Please go to Login → Forgot Password and request a new email, then open the new link on this phone.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  await clearPasswordRecoveryPending();
                },
              },
            ]
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdatePassword = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert(
          'Session expired',
          'Please request a new password reset email and open the link again.'
        );
        return;
      }
      const result = await updatePassword(password);
      if (result.success) {
        // Clearing passwordRecoveryPending remounts App to MainTabs / Login automatically
        Alert.alert('Success', 'Your password has been updated.');
      } else {
        Alert.alert('Error', result.error || 'Failed to update password');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
      console.error('Reset password error:', error);
    } finally {
      setIsSubmitting(false);
    }
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
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Choose a new password for your account. It must be at least 6 characters.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter new password"
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (isSubmitting || hasRecoverySession === false) && styles.disabledButton,
              ]}
              onPress={handleUpdatePassword}
              disabled={isSubmitting || hasRecoverySession === false}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
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
    fontWeight: '800',
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: '#F5F7FA',
    paddingHorizontal: 0,
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
  primaryButton: {
    backgroundColor: '#2A7BF6',
    borderRadius: 16,
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
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
