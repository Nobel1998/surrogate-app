import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

export default function SurrogateMedicalInfoScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // IVF Clinic Information
  const [ivfClinicName, setIvfClinicName] = useState('');
  const [ivfClinicAddress, setIvfClinicAddress] = useState('');
  const [ivfClinicPhone, setIvfClinicPhone] = useState('');
  const [ivfClinicEmail, setIvfClinicEmail] = useState('');
  const [ivfClinicDoctorName, setIvfClinicDoctorName] = useState('');
  
  // OB/GYN Doctor Information
  const [obgynDoctorName, setObgynDoctorName] = useState('');
  const [obgynClinicName, setObgynClinicName] = useState('');
  const [obgynClinicAddress, setObgynClinicAddress] = useState('');
  const [obgynClinicPhone, setObgynClinicPhone] = useState('');
  const [obgynClinicEmail, setObgynClinicEmail] = useState('');
  
  // Delivery Hospital Information
  const [deliveryHospitalName, setDeliveryHospitalName] = useState('');
  const [deliveryHospitalAddress, setDeliveryHospitalAddress] = useState('');
  const [deliveryHospitalPhone, setDeliveryHospitalPhone] = useState('');
  const [deliveryHospitalEmail, setDeliveryHospitalEmail] = useState('');

  useEffect(() => {
    loadMedicalInfo();
  }, [user]);

  const loadMedicalInfo = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('surrogate_medical_info')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading medical info:', error);
        Alert.alert(t('common.error'), t('medicalInfo.loadError'));
        return;
      }

      if (data) {
        setIvfClinicName(data.ivf_clinic_name || '');
        setIvfClinicAddress(data.ivf_clinic_address || '');
        setIvfClinicPhone(data.ivf_clinic_phone || '');
        setIvfClinicEmail(data.ivf_clinic_email || '');
        setIvfClinicDoctorName(data.ivf_clinic_doctor_name || '');
        
        setObgynDoctorName(data.obgyn_doctor_name || '');
        setObgynClinicName(data.obgyn_clinic_name || '');
        setObgynClinicAddress(data.obgyn_clinic_address || '');
        setObgynClinicPhone(data.obgyn_clinic_phone || '');
        setObgynClinicEmail(data.obgyn_clinic_email || '');
        
        setDeliveryHospitalName(data.delivery_hospital_name || '');
        setDeliveryHospitalAddress(data.delivery_hospital_address || '');
        setDeliveryHospitalPhone(data.delivery_hospital_phone || '');
        setDeliveryHospitalEmail(data.delivery_hospital_email || '');
      }
    } catch (error) {
      console.error('Error loading medical info:', error);
      Alert.alert(t('common.error'), t('medicalInfo.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const medicalInfo = {
        user_id: user.id,
        ivf_clinic_name: ivfClinicName.trim() || null,
        ivf_clinic_address: ivfClinicAddress.trim() || null,
        ivf_clinic_phone: ivfClinicPhone.trim() || null,
        ivf_clinic_email: ivfClinicEmail.trim() || null,
        ivf_clinic_doctor_name: ivfClinicDoctorName.trim() || null,
        obgyn_doctor_name: obgynDoctorName.trim() || null,
        obgyn_clinic_name: obgynClinicName.trim() || null,
        obgyn_clinic_address: obgynClinicAddress.trim() || null,
        obgyn_clinic_phone: obgynClinicPhone.trim() || null,
        obgyn_clinic_email: obgynClinicEmail.trim() || null,
        delivery_hospital_name: deliveryHospitalName.trim() || null,
        delivery_hospital_address: deliveryHospitalAddress.trim() || null,
        delivery_hospital_phone: deliveryHospitalPhone.trim() || null,
        delivery_hospital_email: deliveryHospitalEmail.trim() || null,
      };

      const { error } = await supabase
        .from('surrogate_medical_info')
        .upsert(medicalInfo, { onConflict: 'user_id' });

      if (error) throw error;

      Alert.alert(t('common.success'), t('medicalInfo.saveSuccess'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error saving medical info:', error);
      Alert.alert(t('common.error'), t('medicalInfo.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (title, icon, children) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={20} color="#2A7BF6" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const renderInput = (label, value, onChangeText, placeholder, keyboardType = 'default') => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType={keyboardType}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2A7BF6" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('medicalInfo.title')}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {renderSection(
            t('medicalInfo.ivfClinic'),
            'activity',
            <>
              {renderInput(
                t('medicalInfo.clinicName'),
                ivfClinicName,
                setIvfClinicName,
                t('medicalInfo.enterClinicName')
              )}
              {renderInput(
                t('medicalInfo.doctorName'),
                ivfClinicDoctorName,
                setIvfClinicDoctorName,
                t('medicalInfo.enterDoctorName')
              )}
              {renderInput(
                t('medicalInfo.address'),
                ivfClinicAddress,
                setIvfClinicAddress,
                t('medicalInfo.enterAddress')
              )}
              {renderInput(
                t('medicalInfo.phone'),
                ivfClinicPhone,
                setIvfClinicPhone,
                t('medicalInfo.enterPhone'),
                'phone-pad'
              )}
              {renderInput(
                t('medicalInfo.email'),
                ivfClinicEmail,
                setIvfClinicEmail,
                t('medicalInfo.enterEmail'),
                'email-address'
              )}
            </>
          )}

          {renderSection(
            t('medicalInfo.obgynDoctor'),
            'user',
            <>
              {renderInput(
                t('medicalInfo.doctorName'),
                obgynDoctorName,
                setObgynDoctorName,
                t('medicalInfo.enterDoctorName')
              )}
              {renderInput(
                t('medicalInfo.clinicName'),
                obgynClinicName,
                setObgynClinicName,
                t('medicalInfo.enterClinicName')
              )}
              {renderInput(
                t('medicalInfo.address'),
                obgynClinicAddress,
                setObgynClinicAddress,
                t('medicalInfo.enterAddress')
              )}
              {renderInput(
                t('medicalInfo.phone'),
                obgynClinicPhone,
                setObgynClinicPhone,
                t('medicalInfo.enterPhone'),
                'phone-pad'
              )}
              {renderInput(
                t('medicalInfo.email'),
                obgynClinicEmail,
                setObgynClinicEmail,
                t('medicalInfo.enterEmail'),
                'email-address'
              )}
            </>
          )}

          {renderSection(
            t('medicalInfo.deliveryHospital'),
            'home',
            <>
              {renderInput(
                t('medicalInfo.hospitalName'),
                deliveryHospitalName,
                setDeliveryHospitalName,
                t('medicalInfo.enterHospitalName')
              )}
              {renderInput(
                t('medicalInfo.address'),
                deliveryHospitalAddress,
                setDeliveryHospitalAddress,
                t('medicalInfo.enterAddress')
              )}
              {renderInput(
                t('medicalInfo.phone'),
                deliveryHospitalPhone,
                setDeliveryHospitalPhone,
                t('medicalInfo.enterPhone'),
                'phone-pad'
              )}
              {renderInput(
                t('medicalInfo.email'),
                deliveryHospitalEmail,
                setDeliveryHospitalEmail,
                t('medicalInfo.enterEmail'),
                'email-address'
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2A7BF6',
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
});

