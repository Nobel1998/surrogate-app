import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { Feather as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const APPOINTMENT_TYPES = [
  { value: 'routine', label: 'Routine Check-up' },
  { value: 'ultrasound', label: 'Ultrasound' },
  { value: 'lab_work', label: 'Lab Work' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'other', label: 'Other' },
];

const STATUS_COLORS = {
  scheduled: '#3B82F6',
  completed: '#10B981',
  cancelled: '#EF4444',
  rescheduled: '#F59E0B',
};

export default function OBAppointmentsScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [matchId, setMatchId] = useState(null);
  const [formData, setFormData] = useState({
    appointment_date: new Date(),
    appointment_time: new Date(),
    provider_name: '',
    clinic_name: '',
    clinic_address: '',
    clinic_phone: '',
    appointment_type: 'routine',
    notes: '',
  });

  useEffect(() => {
    loadMatchId();
    loadAppointments();
  }, [user]);

  const loadMatchId = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('surrogate_matches')
        .select('id')
        .eq('surrogate_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!error && data) {
        setMatchId(data.id);
      }
    } catch (error) {
      console.error('Error loading match ID:', error);
    }
  };

  const loadAppointments = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ob_appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const handleAdd = () => {
    setFormData({
      appointment_date: new Date(),
      appointment_time: new Date(),
      provider_name: '',
      clinic_name: '',
      clinic_address: '',
      clinic_phone: '',
      appointment_type: 'routine',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData({ ...formData, appointment_date: selectedDate });
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setFormData({ ...formData, appointment_time: selectedTime });
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const t = new Date(`2000-01-01T${time}`);
    return t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleSubmit = async () => {
    if (!formData.provider_name || !formData.clinic_name) {
      Alert.alert('Error', 'Please fill in provider name and clinic name');
      return;
    }

    try {
      const appointmentDate = formData.appointment_date.toISOString().split('T')[0];
      const appointmentTime = formData.appointment_time.toTimeString().split(' ')[0].substring(0, 5);

      const { error } = await supabase
        .from('ob_appointments')
        .insert({
          user_id: user.id,
          match_id: matchId,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          provider_name: formData.provider_name.trim(),
          clinic_name: formData.clinic_name.trim(),
          clinic_address: formData.clinic_address.trim() || null,
          clinic_phone: formData.clinic_phone.trim() || null,
          appointment_type: formData.appointment_type,
          notes: formData.notes.trim() || null,
          status: 'scheduled',
        });

      if (error) throw error;

      Alert.alert('Success', 'Appointment scheduled successfully');
      setShowAddModal(false);
      loadAppointments();
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', 'Failed to create appointment');
    }
  };

  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('ob_appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      Alert.alert('Success', 'Appointment status updated');
      loadAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      Alert.alert('Error', 'Failed to update appointment status');
    }
  };

  const handleDelete = async (appointmentId) => {
    Alert.alert(
      'Delete Appointment',
      'Are you sure you want to delete this appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('ob_appointments')
                .delete()
                .eq('id', appointmentId);

              if (error) throw error;

              Alert.alert('Success', 'Appointment deleted');
              loadAppointments();
            } catch (error) {
              console.error('Error deleting appointment:', error);
              Alert.alert('Error', 'Failed to delete appointment');
            }
          },
        },
      ]
    );
  };

  if (loading && appointments.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>OB Appointments</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OB Appointments</Text>
        <TouchableOpacity onPress={handleAdd}>
          <Icon name="plus" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {appointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="calendar" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No appointments scheduled</Text>
            <Text style={styles.emptySubtext}>Tap + to schedule an appointment</Text>
          </View>
        ) : (
          appointments.map((appointment) => (
            <View key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentDate}>
                  <Text style={styles.dateText}>{formatDate(appointment.appointment_date)}</Text>
                  <Text style={styles.timeText}>{formatTime(appointment.appointment_time)}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[appointment.status] || '#999' },
                  ]}
                >
                  <Text style={styles.statusText}>{appointment.status}</Text>
                </View>
              </View>

              <View style={styles.appointmentBody}>
                <View style={styles.infoRow}>
                  <Icon name="user" size={16} color="#666" />
                  <Text style={styles.infoText}>{appointment.provider_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Icon name="map-pin" size={16} color="#666" />
                  <Text style={styles.infoText}>{appointment.clinic_name}</Text>
                </View>
                {appointment.clinic_address && (
                  <View style={styles.infoRow}>
                    <Icon name="navigation" size={16} color="#666" />
                    <Text style={styles.infoText}>{appointment.clinic_address}</Text>
                  </View>
                )}
                {appointment.clinic_phone && (
                  <View style={styles.infoRow}>
                    <Icon name="phone" size={16} color="#666" />
                    <Text style={styles.infoText}>{appointment.clinic_phone}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Icon name="tag" size={16} color="#666" />
                  <Text style={styles.infoText}>
                    {APPOINTMENT_TYPES.find((t) => t.value === appointment.appointment_type)?.label ||
                      appointment.appointment_type}
                  </Text>
                </View>
                {appointment.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesText}>{appointment.notes}</Text>
                  </View>
                )}
              </View>

              <View style={styles.appointmentActions}>
                {appointment.status === 'scheduled' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => handleStatusUpdate(appointment.id, 'completed')}
                    >
                      <Text style={styles.actionButtonText}>Mark Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleStatusUpdate(appointment.id, 'cancelled')}
                    >
                      <Text style={styles.actionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(appointment.id)}
                >
                  <Icon name="trash-2" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Appointment Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule OB Appointment</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Date *</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text>{formatDate(formData.appointment_date)}</Text>
                  <Icon name="calendar" size={20} color="#666" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={formData.appointment_date}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Time *</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text>{formatTime(formData.appointment_time.toTimeString().split(' ')[0])}</Text>
                  <Icon name="clock" size={20} color="#666" />
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={formData.appointment_time}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Provider Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.provider_name}
                  onChangeText={(text) => setFormData({ ...formData, provider_name: text })}
                  placeholder="Dr. Smith"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Clinic Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.clinic_name}
                  onChangeText={(text) => setFormData({ ...formData, clinic_name: text })}
                  placeholder="ABC Medical Center"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Clinic Address</Text>
                <TextInput
                  style={styles.input}
                  value={formData.clinic_address}
                  onChangeText={(text) => setFormData({ ...formData, clinic_address: text })}
                  placeholder="123 Main St, City, State"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Clinic Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.clinic_phone}
                  onChangeText={(text) => setFormData({ ...formData, clinic_phone: text })}
                  placeholder="(555) 123-4567"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Appointment Type *</Text>
                <View style={styles.typeContainer}>
                  {APPOINTMENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeButton,
                        formData.appointment_type === type.value && styles.typeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, appointment_type: type.value })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          formData.appointment_type === type.value && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="Additional notes..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitModalButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.submitModalButtonText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  appointmentCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentDate: {
    flex: 1,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    textTransform: 'capitalize',
  },
  appointmentBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  cancelButton: {
    backgroundColor: '#F59E0B',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFF',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  typeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitModalButton: {
    backgroundColor: '#3B82F6',
  },
  submitModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

