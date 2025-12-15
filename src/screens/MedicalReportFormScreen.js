import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { uploadMedia } from '../utils/mediaUpload';

export default function MedicalReportFormScreen({ route }) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { stage, onSubmit } = route?.params || {};

  const [formData, setFormData] = useState({});
  const [providerName, setProviderName] = useState('');
  const [providerContact, setProviderContact] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Determine current stage if not provided
  const currentStage = stage || 'Pre-Transfer';

  useEffect(() => {
    // Set default visit date to today
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = String(today.getFullYear()).slice(-2);
    setVisitDate(`${month}/${day}/${year}`);
  }, []);

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCheckboxChange = (groupKey, value, checked) => {
    setFormData((prev) => {
      const current = prev[groupKey] || [];
      if (checked) {
        return { ...prev, [groupKey]: [...current, value] };
      } else {
        return { ...prev, [groupKey]: current.filter((item) => item !== value) };
      }
    });
  };

  const isChecked = (key, value) => {
    const arr = formData[key] || [];
    return Array.isArray(arr) && arr.includes(value);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setProofImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async () => {
    if (!proofImage) return null;

    try {
      const fileExtension = proofImage.uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}_${Date.now()}.${fileExtension}`;
      const filePath = `medical-reports/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: proofImage.uri,
        type: `image/${fileExtension}`,
        name: fileName,
      });

      const { data, error } = await supabase.storage
        .from('post-media')
        .upload(filePath, formData, {
          contentType: `image/${fileExtension}`,
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('post-media')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const parseMMDDYYToISO = (s) => {
    if (!s || typeof s !== 'string') return null;
    const trimmed = s.trim();
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!match) return null;
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (Number.isNaN(d.getTime())) return null;
    if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return d;
  };

  const formatDateToISO = (date) => {
    if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {
    if (!visitDate) {
      Alert.alert('Validation Error', 'Please enter visit date.');
      return;
    }

    const parsedDate = parseMMDDYYToISO(visitDate);
    if (!parsedDate) {
      Alert.alert('Validation Error', 'Please enter a valid visit date in MM/DD/YY format.');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = null;
      if (proofImage) {
        setUploading(true);
        try {
          imageUrl = await uploadImage();
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          Alert.alert('Upload Error', 'Failed to upload image. Do you want to continue without the image?', [
            { text: 'Cancel', style: 'cancel', onPress: () => setSaving(false) },
            { text: 'Continue', onPress: () => submitReport(null) },
          ]);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      await submitReport(imageUrl);
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit medical report. Please try again.');
      setSaving(false);
      setUploading(false);
    }
  };

  const submitReport = async (imageUrl) => {
    try {
      const visitDateISO = formatDateToISO(parseMMDDYYToISO(visitDate));

      const { error } = await supabase.from('medical_reports').insert({
        user_id: user.id,
        visit_date: visitDateISO,
        provider_name: providerName.trim() || null,
        provider_contact: providerContact.trim() || null,
        stage: currentStage,
        report_data: formData,
        proof_image_url: imageUrl,
      });

      if (error) throw error;

      Alert.alert('Success', 'Medical report submitted successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            if (onSubmit) {
              onSubmit();
            }
            navigation.goBack();
          }
        },
      ]);
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const renderCheckbox = (label, groupKey, value) => {
    const checked = isChecked(groupKey, value);
    return (
      <TouchableOpacity
        key={value}
        style={styles.checkboxRow}
        onPress={() => handleCheckboxChange(groupKey, value, !checked)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Icon name="check" size={14} color="#fff" />}
        </View>
        <Text style={styles.checkboxLabel}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderPreTransferForm = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Labs</Text>
        <View style={styles.checkboxGroup}>
          {renderCheckbox('Estradiol', 'labs', 'estradiol')}
          {renderCheckbox('Progesterone', 'labs', 'progesterone')}
          {renderCheckbox('FSH', 'labs', 'fsh')}
          {renderCheckbox('LH', 'labs', 'lh')}
          {renderCheckbox('Beta hGC', 'labs', 'beta_hgc')}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Test Site</Text>
        <View style={styles.checkboxGroup}>
          {renderCheckbox('Labcorp', 'test_site', 'labcorp')}
          {renderCheckbox('IVF clinic', 'test_site', 'ivf_clinic')}
          {renderCheckbox('Others', 'test_site', 'others')}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Lab Test Date (MM/DD/YY)</Text>
        <TextInput
          style={styles.input}
          value={formData.lab_test_date || ''}
          onChangeText={(value) => handleFieldChange('lab_test_date', value)}
          placeholder="e.g. 12/01/25"
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Follicle Ultrasound</Text>
        
        <Text style={styles.sectionLabel}>Top 4 Follicles Measurement</Text>
        {[1, 2, 3, 4].map((num) => (
          <View key={num} style={styles.follicleRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              value={formData[`follicle_${num}_mm`] || ''}
              onChangeText={(value) => handleFieldChange(`follicle_${num}_mm`, value)}
              placeholder={`${num}. mm`}
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioButton, formData[`follicle_${num}_ovary`] === 'L' && styles.radioButtonSelected]}
                onPress={() => handleFieldChange(`follicle_${num}_ovary`, 'L')}
              >
                <Text style={[styles.radioText, formData[`follicle_${num}_ovary`] === 'L' && styles.radioTextSelected]}>L</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, formData[`follicle_${num}_ovary`] === 'R' && styles.radioButtonSelected]}
                onPress={() => handleFieldChange(`follicle_${num}_ovary`, 'R')}
              >
                <Text style={[styles.radioText, formData[`follicle_${num}_ovary`] === 'R' && styles.radioTextSelected]}>R</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Endometrial Thickness (mm)</Text>
          <TextInput
            style={styles.input}
            value={formData.endometrial_thickness || ''}
            onChangeText={(value) => handleFieldChange('endometrial_thickness', value)}
            placeholder="e.g. 8.5"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Endometrial Type</Text>
          <TextInput
            style={styles.input}
            value={formData.endometrial_type || ''}
            onChangeText={(value) => handleFieldChange('endometrial_type', value)}
            placeholder="e.g. Triple line"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ultrasound Test Date (MM/DD/YY)</Text>
          <TextInput
            style={styles.input}
            value={formData.ultrasound_test_date || ''}
            onChangeText={(value) => handleFieldChange('ultrasound_test_date', value)}
            placeholder="e.g. 12/01/25"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes || ''}
            onChangeText={(value) => handleFieldChange('notes', value)}
            placeholder="Additional notes..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
          />
        </View>
      </View>
    </>
  );

  const renderPostTransferForm = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Labs</Text>
        <View style={styles.checkboxGroup}>
          {renderCheckbox('Beta hGC', 'labs', 'beta_hgc')}
          {renderCheckbox('Progesterone', 'labs', 'progesterone')}
          {renderCheckbox('Estradiol', 'labs', 'estradiol')}
          {renderCheckbox('TSH', 'labs', 'tsh')}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Test Site</Text>
        <View style={styles.checkboxGroup}>
          {renderCheckbox('Labcorp', 'test_site', 'labcorp')}
          {renderCheckbox('IVF clinic', 'test_site', 'ivf_clinic')}
          {renderCheckbox('Others', 'test_site', 'others')}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Lab Test Date (MM/DD/YY)</Text>
        <TextInput
          style={styles.input}
          value={formData.lab_test_date || ''}
          onChangeText={(value) => handleFieldChange('lab_test_date', value)}
          placeholder="e.g. 12/01/25"
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transvaginal Ultrasound</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Gestational Sac Diameter (mm)</Text>
          <TextInput
            style={styles.input}
            value={formData.gestational_sac_diameter || ''}
            onChangeText={(value) => handleFieldChange('gestational_sac_diameter', value)}
            placeholder="e.g. 15.2"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Yolk Sac Diameter (mm)</Text>
          <TextInput
            style={styles.input}
            value={formData.yolk_sac_diameter || ''}
            onChangeText={(value) => handleFieldChange('yolk_sac_diameter', value)}
            placeholder="e.g. 3.5"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Crown Rump Length (mm)</Text>
          <TextInput
            style={styles.input}
            value={formData.crown_rump_length || ''}
            onChangeText={(value) => handleFieldChange('crown_rump_length', value)}
            placeholder="e.g. 5.2"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Fetal Heart Rate (bpm)</Text>
          <TextInput
            style={styles.input}
            value={formData.fetal_heart_rate || ''}
            onChangeText={(value) => handleFieldChange('fetal_heart_rate', value)}
            placeholder="e.g. 150"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Gestational Age</Text>
          <TextInput
            style={styles.input}
            value={formData.gestational_age || ''}
            onChangeText={(value) => handleFieldChange('gestational_age', value)}
            placeholder="e.g. 6 weeks 3 days"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EDD (Estimated Due Date) (MM/DD/YY)</Text>
          <TextInput
            style={styles.input}
            value={formData.edd || ''}
            onChangeText={(value) => handleFieldChange('edd', value)}
            placeholder="e.g. 08/15/26"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ultrasound Test Date (MM/DD/YY)</Text>
          <TextInput
            style={styles.input}
            value={formData.ultrasound_test_date || ''}
            onChangeText={(value) => handleFieldChange('ultrasound_test_date', value)}
            placeholder="e.g. 12/01/25"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes || ''}
            onChangeText={(value) => handleFieldChange('notes', value)}
            placeholder="Additional notes..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
          />
        </View>
      </View>
    </>
  );

  const renderOBGYNForm = () => {
    const screeningTests = [
      { key: 'nt_screen', label: 'NT Screen Normal' },
      { key: 'quad_screen', label: 'Quad Screen Normal' },
      { key: 'anatomy_scan', label: 'Anatomy Scan Normal' },
      { key: 'glucose_screening', label: 'Glucose Screening Normal' },
      { key: 'gbs_testing', label: 'GBS Testing Normal' },
      { key: 'nipt_cvs_amniocentesis', label: 'NIPT/CVS/Amniocentesis Normal (not required)' },
    ];

    return (
      <>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Surrogate's Weight (lbs)</Text>
          <TextInput
            style={styles.input}
            value={formData.weight || ''}
            onChangeText={(value) => handleFieldChange('weight', value)}
            placeholder="e.g. 145"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Blood Pressure</Text>
          <TextInput
            style={styles.input}
            value={formData.blood_pressure || ''}
            onChangeText={(value) => handleFieldChange('blood_pressure', value)}
            placeholder="e.g. 120/80"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Stomach Measurement (cm)</Text>
          <TextInput
            style={styles.input}
            value={formData.stomach_measurement || ''}
            onChangeText={(value) => handleFieldChange('stomach_measurement', value)}
            placeholder="e.g. 32"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Fetal Heartbeats (bpm)</Text>
          <TextInput
            style={styles.input}
            value={formData.fetal_heartbeats || ''}
            onChangeText={(value) => handleFieldChange('fetal_heartbeats', value)}
            placeholder="e.g. 150"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Effacement</Text>
          <TextInput
            style={styles.input}
            value={formData.effacement || ''}
            onChangeText={(value) => handleFieldChange('effacement', value)}
            placeholder="e.g. 50% or 2cm"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Dilation (cm)</Text>
          <TextInput
            style={styles.input}
            value={formData.dilation || ''}
            onChangeText={(value) => handleFieldChange('dilation', value)}
            placeholder="e.g. 2"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screening Tests</Text>
          {screeningTests.map((test) => (
            <View key={test.key} style={styles.screeningTestRow}>
              <Text style={styles.sectionLabel}>{test.label}</Text>
              <View style={styles.screeningTestControls}>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[styles.radioButton, formData[`${test.key}_normal`] === 'yes' && styles.radioButtonSelected]}
                    onPress={() => handleFieldChange(`${test.key}_normal`, 'yes')}
                  >
                    <Text style={[styles.radioText, formData[`${test.key}_normal`] === 'yes' && styles.radioTextSelected]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioButton, formData[`${test.key}_normal`] === 'no' && styles.radioButtonSelected]}
                    onPress={() => handleFieldChange(`${test.key}_normal`, 'no')}
                  >
                    <Text style={[styles.radioText, formData[`${test.key}_normal`] === 'no' && styles.radioTextSelected]}>No</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 12 }]}
                  value={formData[`${test.key}_test_date`] || ''}
                  onChangeText={(value) => handleFieldChange(`${test.key}_test_date`, value)}
                  placeholder="Test date (MM/DD/YY)"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Gestational Age</Text>
          <TextInput
            style={styles.input}
            value={formData.gestational_age || ''}
            onChangeText={(value) => handleFieldChange('gestational_age', value)}
            placeholder="e.g. 28 weeks 3 days"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Next Appointment Date (MM/DD/YY)</Text>
          <TextInput
            style={styles.input}
            value={formData.next_appointment_date || ''}
            onChangeText={(value) => handleFieldChange('next_appointment_date', value)}
            placeholder="e.g. 01/15/26"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes || ''}
            onChangeText={(value) => handleFieldChange('notes', value)}
            placeholder="Additional notes..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
          />
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-left" size={24} color="#1A1D1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical Check-in</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.stageBadge}>
            <Text style={styles.stageBadgeText}>{currentStage}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Visit Date (MM/DD/YY) *</Text>
            <TextInput
              style={styles.input}
              value={visitDate}
              onChangeText={setVisitDate}
              placeholder="e.g. 12/01/25"
              placeholderTextColor="#94A3B8"
            />
          </View>

          {currentStage === 'Pre-Transfer' && renderPreTransferForm()}
          {currentStage === 'Post-Transfer' && renderPostTransferForm()}
          {currentStage === 'OBGYN' && renderOBGYNForm()}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical Provider Information</Text>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Name of Medical Provider</Text>
              <TextInput
                style={styles.input}
                value={providerName}
                onChangeText={setProviderName}
                placeholder="e.g. Dr. Smith"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Contact Information</Text>
              <TextInput
                style={styles.input}
                value={providerContact}
                onChangeText={setProviderContact}
                placeholder="e.g. phone, email"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Upload Clinic Note/Ultrasound (Proof)</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage} activeOpacity={0.8}>
              <Icon name="upload" size={20} color="#1F6FE0" />
              <Text style={styles.uploadButtonText}>
                {proofImage ? 'Change Image' : 'Select Image'}
              </Text>
            </TouchableOpacity>
            {proofImage && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: proofImage.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setProofImage(null)}
                >
                  <Icon name="x" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (saving || uploading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving || uploading}
            activeOpacity={0.8}
          >
            {saving || uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
  },
  stageBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F6FE0',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1D1E',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  checkboxGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    minWidth: '30%',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#94A3B8',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#1F6FE0',
    borderColor: '#1F6FE0',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  follicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  radioButtonSelected: {
    backgroundColor: '#1F6FE0',
    borderColor: '#1F6FE0',
  },
  radioText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  radioTextSelected: {
    color: '#fff',
  },
  screeningTestRow: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  screeningTestControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#D6E6FF',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F6FE0',
  },
  imagePreview: {
    marginTop: 12,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#1F6FE0',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#1F6FE0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
