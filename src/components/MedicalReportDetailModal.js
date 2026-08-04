import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

function formatVisitDate(visitDate) {
  if (!visitDate) return 'N/A';
  const s = String(visitDate);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  return s;
}

function formatValue(v) {
  if (v == null || v === '') return '—';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * Read-only medical check-in detail modal (My Journey style).
 */
export default function MedicalReportDetailModal({
  visible,
  report,
  onClose,
  onEdit,
}) {
  const { t } = useLanguage();

  const reportDataLabelMap = useMemo(
    () => ({
      provider_contact: t('medicalReport.providerContact'),
      visit_time: t('medicalReport.visitTime'),
      endometrial_thickness: t('medicalReport.endometrialThickness'),
      endometrial_type: t('medicalReport.endometrialType'),
      follicle_1_mm: `${t('medicalReport.follicle')} 1 (mm)`,
      follicle_2_mm: `${t('medicalReport.follicle')} 2 (mm)`,
      follicle_3_mm: `${t('medicalReport.follicle')} 3 (mm)`,
      follicle_4_mm: `${t('medicalReport.follicle')} 4 (mm)`,
      labs: t('medicalReport.labs'),
      lab_test_date: t('medicalReport.labTestDate'),
      ultrasound_test_date: t('medicalReport.ultrasoundTestDate'),
      notes: t('medicalReport.notes'),
      additional_notes: t('medicalReport.additionalNotes'),
      beta_hcg: t('medicalReport.betaHcg'),
      gestational_sac_diameter: t('medicalReport.gestationalSacDiameter'),
      yolk_sac_diameter: t('medicalReport.yolkSacDiameter'),
      crown_rump_length: t('medicalReport.crownRumpLength'),
      fetal_heart_rate: t('medicalReport.fetalHeartRate'),
      gestational_age: t('medicalReport.gestationalAge'),
      edd: t('medicalReport.edd'),
      weight: t('medicalReport.surrogateWeight'),
      blood_pressure: t('medicalReport.bloodPressure'),
      stomach_measurement: t('medicalReport.stomachMeasurement'),
      fetal_heartbeats: t('medicalReport.fhr'),
      next_appointment_date: t('medicalReport.nextCheckDate'),
      next_appointment_time: t('medicalReport.nextCheckTime'),
      nt_screen_normal: t('medicalReport.ntScreen'),
      nt_screen_test_date: `${t('medicalReport.ntScreen')} ${t('medicalReport.testDate')}`,
      quad_screen_normal: t('medicalReport.quadScreen'),
      quad_screen_test_date: `${t('medicalReport.quadScreen')} ${t('medicalReport.testDate')}`,
      anatomy_scan_normal: t('medicalReport.anatomyScan'),
      anatomy_scan_test_date: `${t('medicalReport.anatomyScan')} ${t('medicalReport.testDate')}`,
      glucose_screening_normal: t('medicalReport.glucoseScreening'),
      glucose_screening_test_date: `${t('medicalReport.glucoseScreening')} ${t('medicalReport.testDate')}`,
      gbs_testing_normal: t('medicalReport.gbsTesting'),
      gbs_testing_test_date: `${t('medicalReport.gbsTesting')} ${t('medicalReport.testDate')}`,
      nipt_cvs_amniocentesis_normal: t('medicalReport.niptCvsAmniocentesis'),
      nipt_cvs_amniocentesis_test_date: `${t('medicalReport.niptCvsAmniocentesis')} ${t('medicalReport.testDate')}`,
      test_site: t('medicalReport.testSite'),
      effacement: 'Effacement',
      dilation: 'Dilation',
    }),
    [t]
  );

  if (!visible || !report) return null;

  const reportData =
    report.report_data && typeof report.report_data === 'object' ? report.report_data : {};
  const uploadedByAdmin = report.uploaded_by === 'admin';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <Text style={styles.title}>{t('medicalReport.title')}</Text>
              {report.stage ? (
                <Text style={styles.stage}>{report.stage}</Text>
              ) : null}
            </View>
            <View style={styles.headerActions}>
              {typeof onEdit === 'function' ? (
                <TouchableOpacity onPress={onEdit} hitSlop={12} style={styles.editBtn}>
                  <Icon name="edit-2" size={18} color="#1F6FE0" />
                  <Text style={styles.editBtnText}>{t('common.edit')}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={onClose} hitSlop={16}>
                <Icon name="x" size={24} color="#1A1D1E" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('medicalReport.visitDate')}</Text>
              <Text style={styles.sectionValue}>{formatVisitDate(report.visit_date)}</Text>
            </View>
            {reportData.visit_time ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('medicalReport.visitTime')}</Text>
                <Text style={styles.sectionValue}>{formatValue(reportData.visit_time)}</Text>
              </View>
            ) : null}

            {report.provider_name ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('medicalReport.providerName')}</Text>
                <Text style={styles.sectionValue}>{report.provider_name}</Text>
              </View>
            ) : null}

            <View style={styles.badgeRow}>
              <View style={uploadedByAdmin ? styles.adminBadge : styles.surrogateBadge}>
                <Text style={uploadedByAdmin ? styles.adminBadgeText : styles.surrogateBadgeText}>
                  {uploadedByAdmin
                    ? t('medicalReport.adminUploaded')
                    : t('medicalReport.surrogateUploaded')}
                </Text>
              </View>
            </View>

            {Object.entries(reportData)
              .filter(([k, v]) => v != null && v !== '' && k !== 'provider_contact' && k !== 'visit_time')
              .map(([key, value]) => {
                const label = reportDataLabelMap[key] || key.replace(/_/g, ' ');
                return (
                  <View key={key} style={styles.section}>
                    <Text style={styles.sectionTitle}>{label}</Text>
                    <Text style={styles.sectionValue}>{formatValue(value)}</Text>
                  </View>
                );
              })}

            {reportData.provider_contact ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('medicalReport.providerContact')}</Text>
                <Text style={styles.sectionValue}>{formatValue(reportData.provider_contact)}</Text>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('medicalReport.providerContact')}</Text>
                <Text style={styles.sectionValue}>888888</Text>
              </View>
            )}

            {report.proof_image_url ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('medicalReport.uploadProof')}</Text>
                <Image
                  source={{ uri: report.proof_image_url }}
                  style={styles.proofImage}
                  resizeMode="cover"
                />
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Resolve medical check-in linked to an appointment.
 * Prefer visit_date match (check-in for that visit), else source_medical_report_id.
 */
export async function fetchMedicalReportForAppointment(supabase, appointment, userId) {
  if (!appointment || !userId) return null;

  const visitDate = String(appointment.appointment_date || '').slice(0, 10);
  if (visitDate) {
    const { data: byDate } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('visit_date', visitDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byDate) return byDate;
  }

  if (appointment.source_medical_report_id) {
    const { data: bySource } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('id', appointment.source_medical_report_id)
      .maybeSingle();
    if (bySource) return bySource;
  }

  return null;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerTitles: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  stage: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editBtnText: {
    color: '#1F6FE0',
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sectionValue: {
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 22,
  },
  badgeRow: {
    marginBottom: 14,
  },
  adminBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E65100',
  },
  surrogateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  surrogateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  proofImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginTop: 4,
  },
});
