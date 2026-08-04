import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useParentMatch } from '../context/ParentMatchContext';
import { useNotifications } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { Feather as Icon } from '@expo/vector-icons';
import MedicalReportDetailModal, {
  fetchMedicalReportForAppointment,
  buildEmptyCheckInForAppointment,
} from '../components/MedicalReportDetailModal';
import {
  autoCompletePastAppointments,
  getEffectiveAppointmentStatus,
} from '../utils/autoCompletePastAppointments';
import { formatDateOnlyDisplay } from '../utils/dateOnly';

const STATUS_COLORS = {
  scheduled: '#3B82F6',
  completed: '#10B981',
  cancelled: '#EF4444',
  rescheduled: '#F59E0B',
};

export default function IVFAppointmentsScreen({ navigation }) {
  const { user } = useAuth();
  const parentMatch = useParentMatch();
  const { scheduleMedicalAppointmentReminders, cancelMedicalAppointmentReminders } = useNotifications();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchedSurrogateId, setMatchedSurrogateId] = useState(null);
  const [selectedMedicalReport, setSelectedMedicalReport] = useState(null);
  const [loadingCheckIn, setLoadingCheckIn] = useState(false);
  const isParent = (user?.role || '').toLowerCase() === 'parent';
  const isSurrogate = (user?.role || '').toLowerCase() === 'surrogate';

  useEffect(() => {
    if (!user?.id || isParent) return;
    loadAppointments();
  }, [user?.id, isParent]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || !isParent) return undefined;
      let cancelled = false;
      (async () => {
        try {
          const { activeMatch } = await parentMatch.refreshMatches();
          if (cancelled) return;
          const surrogateId = activeMatch?.surrogate_id || null;
          setMatchedSurrogateId(surrogateId);
          if (surrogateId) {
            await loadAppointmentsForUser(surrogateId);
          } else {
            setAppointments([]);
            setLoading(false);
          }
        } catch (e) {
          console.error('Error loading parent IVF context:', e);
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.id, isParent, parentMatch.refreshMatches])
  );

  const loadAppointmentsForUser = async (targetUserId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ivf_appointments')
        .select('*')
        .eq('user_id', targetUserId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      let list = data || [];
      list = await autoCompletePastAppointments({
        table: 'ivf_appointments',
        appointments: list,
        cancelReminder: !isParent ? cancelMedicalAppointmentReminders : undefined,
      });
      setAppointments(list);

      if (Array.isArray(list) && !isParent) {
        list.forEach((appointment) => {
          if (!appointment?.id) return;
          const appointmentKey = `ivf_${appointment.id}`;
          const effectiveStatus = getEffectiveAppointmentStatus(appointment);

          if (effectiveStatus === 'scheduled') {
            void scheduleMedicalAppointmentReminders({
              appointmentKey,
              appointmentType: 'IVF',
              appointmentDate: appointment.appointment_date,
              appointmentTime: appointment.appointment_time,
              providerName: appointment.provider_name,
              clinicName: appointment.clinic_name,
            }).catch((scheduleError) => {
              console.error('Failed to schedule IVF reminder:', scheduleError);
            });
          } else {
            void cancelMedicalAppointmentReminders(appointmentKey).catch((cancelError) => {
              console.error('Failed to cancel IVF reminder:', cancelError);
            });
          }
        });
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAppointments = async () => {
    if (!user?.id) return;
    loadAppointmentsForUser(user.id);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (isParent) {
      (async () => {
        try {
          const { activeMatch } = await parentMatch.refreshMatches();
          const sid = activeMatch?.surrogate_id || null;
          setMatchedSurrogateId(sid);
          if (sid) await loadAppointmentsForUser(sid);
          else {
            setAppointments([]);
            setRefreshing(false);
            setLoading(false);
          }
        } catch (e) {
          console.error('IVF refresh (parent):', e);
          setRefreshing(false);
          setLoading(false);
        }
      })();
    } else {
      loadAppointments();
    }
  };

  const formatDate = (date) => formatDateOnlyDisplay(date);

  const formatTime = (time) => {
    if (!time) return '';
    const t = new Date(`2000-01-01T${time}`);
    return t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
                .from('ivf_appointments')
                .delete()
                .eq('id', appointmentId);

              if (error) throw error;

              await cancelMedicalAppointmentReminders(`ivf_${appointmentId}`);
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

  const openLinkedCheckIn = async (appointment) => {
    const effectiveStatus = getEffectiveAppointmentStatus(appointment);
    if (!appointment || effectiveStatus !== 'completed') return;
    const ownerId = isParent ? matchedSurrogateId : user?.id;
    if (!ownerId) {
      Alert.alert('Check-in', 'Unable to load linked medical check-in.');
      return;
    }
    setLoadingCheckIn(true);
    try {
      const report = await fetchMedicalReportForAppointment(supabase, appointment, ownerId);
      // Auto-completed next appointments stay empty until a new check-in claims them as visit
      setSelectedMedicalReport(report || buildEmptyCheckInForAppointment(appointment));
    } catch (e) {
      console.error('Error loading linked check-in:', e);
      Alert.alert('Error', 'Failed to load medical check-in');
    } finally {
      setLoadingCheckIn(false);
    }
  };

  if (loading && appointments.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>IVF Appointments</Text>
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
        <Text style={styles.headerTitle}>IVF Appointments</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {appointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="calendar" size={48} color="#CCC" />
            <Text style={styles.emptyText}>
              {isParent ? 'No surrogate appointments yet' : 'No appointments yet'}
            </Text>
            {!isParent && (
              <Text style={styles.emptySubtext}>
                Next checks from Pre/Post-Transfer medical check-ins appear here automatically.
                Each check-in visit is also listed as completed.
              </Text>
            )}
          </View>
        ) : (
          appointments.map((appointment) => {
            const effectiveStatus = getEffectiveAppointmentStatus(appointment);
            const isCompleted = effectiveStatus === 'completed';
            const CardWrapper = isCompleted ? TouchableOpacity : View;
            const cardProps = isCompleted
              ? {
                  activeOpacity: 0.85,
                  onPress: () => openLinkedCheckIn(appointment),
                  disabled: loadingCheckIn,
                }
              : {};
            return (
              <CardWrapper
                key={appointment.id}
                style={styles.appointmentCard}
                {...cardProps}
              >
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentDate}>
                  <Text style={styles.dateText}>{formatDate(appointment.appointment_date)}</Text>
                  <Text style={styles.timeText}>{formatTime(appointment.appointment_time)}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[effectiveStatus] || '#999' },
                  ]}
                >
                  <Text style={styles.statusText}>{effectiveStatus}</Text>
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
                {appointment.clinic_address ? (
                  <View style={styles.infoRow}>
                    <Icon name="navigation" size={16} color="#666" />
                    <Text style={styles.infoText}>{appointment.clinic_address}</Text>
                  </View>
                ) : null}
                {(() => {
                  const values = [
                    String(appointment.clinic_phone || '').trim(),
                    String(appointment.clinic_email || '').trim(),
                  ].filter((v, i, arr) => v && v !== '888888' && arr.indexOf(v) === i);
                  const text = values.length > 0 ? values.join(' / ') : '888888';
                  return (
                    <View style={styles.infoRow}>
                      <Icon name="phone" size={16} color="#666" />
                      <Icon name="mail" size={16} color="#666" style={{ marginLeft: 8 }} />
                      <Text style={styles.infoText}>{text}</Text>
                    </View>
                  );
                })()}
                {appointment.notes ? (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesText}>{appointment.notes}</Text>
                  </View>
                ) : null}
                {isCompleted ? (
                  <Text style={styles.tapHint}>Tap to view My Journey check-in</Text>
                ) : null}
              </View>

              {!isParent && (
                <View style={styles.appointmentActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(appointment.id)}
                  >
                    <Icon name="trash-2" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </CardWrapper>
            );
          })
        )}
      </ScrollView>

      <MedicalReportDetailModal
        visible={!!selectedMedicalReport}
        report={selectedMedicalReport}
        onClose={() => setSelectedMedicalReport(null)}
        onEdit={
          isSurrogate && selectedMedicalReport?.id
            ? () => {
                const reportToEdit = selectedMedicalReport;
                setSelectedMedicalReport(null);
                navigation.navigate('MedicalReportForm', {
                  stage: reportToEdit.stage,
                  report: reportToEdit,
                });
              }
            : undefined
        }
      />
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
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
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
  tapHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#1F6FE0',
    fontWeight: '600',
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
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
});
