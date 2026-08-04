import React, { useEffect, useMemo, useState } from 'react';
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
import { supabase } from '../lib/supabase';
import { APP_API_BASE_URL } from '../constants/api';

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

function containsChinese(text) {
  return /[\u3400-\u9fff]/.test(String(text || ''));
}

function localizeMedicalStage(stage, t) {
  const raw = String(stage || '').trim();
  if (!raw) return '';
  const map = {
    'Pre-Transfer': t('medicalReport.stagePreTransfer'),
    'Post-Transfer': t('medicalReport.stagePostTransfer'),
    OBGYN: t('medicalReport.stageOBGYN'),
    pre_transfer: t('medicalReport.stagePreTransfer'),
    post_transfer: t('medicalReport.stagePostTransfer'),
    obgyn: t('medicalReport.stageOBGYN'),
  };
  return map[raw] || map[raw.replace(/\s+/g, '_').toLowerCase()] || raw;
}

function formatLocalizedValue(key, value, t) {
  if (value == null || value === '') return '—';
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : value;
  if (typeof normalized === 'string') {
    if (normalized === 'yes') return t('medicalReport.yes');
    if (normalized === 'no') return t('medicalReport.no');
    if (normalized === 'l' || normalized === 'left') return t('medicalReport.ovaryLeft');
    if (normalized === 'r' || normalized === 'right') return t('medicalReport.ovaryRight');
  }
  return formatValue(value);
}

function parseReportData(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  return {};
}

const NOTE_KEYS = ['notes', 'note', 'additional_notes', 'questions_for_team', 'other_concerns'];

function extractNoteEntries(reportData, labelMap) {
  const seen = new Set();
  const entries = [];
  for (const key of NOTE_KEYS) {
    const raw = reportData[key];
    if (raw == null || raw === '') continue;
    const text = String(raw).trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    entries.push({
      key,
      label: labelMap[key] || key.replace(/_/g, ' '),
      value: text,
    });
  }
  return entries;
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
  const { t, language } = useLanguage();
  const [translatedNoteValues, setTranslatedNoteValues] = useState({});
  const activeReport = report || {};

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
      follicle_1_ovary: `${t('medicalReport.follicle')} 1 ${t('medicalReport.ovary')}`,
      follicle_2_ovary: `${t('medicalReport.follicle')} 2 ${t('medicalReport.ovary')}`,
      follicle_3_ovary: `${t('medicalReport.follicle')} 3 ${t('medicalReport.ovary')}`,
      follicle_4_ovary: `${t('medicalReport.follicle')} 4 ${t('medicalReport.ovary')}`,
      labs: t('medicalReport.labs'),
      lab_test_date: t('medicalReport.labTestDate'),
      ultrasound_test_date: t('medicalReport.ultrasoundTestDate'),
      notes: t('medicalReport.notes'),
      note: t('medicalReport.notes'),
      additional_notes: t('medicalReport.additionalNotes'),
      questions_for_team: t('medicalReport.notes'),
      other_concerns: 'Other Concerns',
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
      effacement: t('medicalReport.effacement'),
      dilation: t('medicalReport.dilation'),
    }),
    [t]
  );

  const reportData = useMemo(() => parseReportData(activeReport.report_data), [activeReport.report_data]);
  const noteEntries = useMemo(
    () => extractNoteEntries(reportData, reportDataLabelMap),
    [reportData, reportDataLabelMap]
  );
  const uploadedByAdmin = activeReport.uploaded_by === 'admin';
  const isEmptyPlaceholder = !!activeReport._emptyPlaceholder;

  useEffect(() => {
    let cancelled = false;
    const translateNotes = async () => {
      if (!visible || noteEntries.length === 0) {
        setTranslatedNoteValues((prev) => (Object.keys(prev).length > 0 ? {} : prev));
        return;
      }
      if (language === 'en') {
        setTranslatedNoteValues((prev) => (Object.keys(prev).length > 0 ? {} : prev));
        return;
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (sessionError || !accessToken) {
        setTranslatedNoteValues((prev) => (Object.keys(prev).length > 0 ? {} : prev));
        return;
      }

      const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await fetch(url, { ...options, signal: controller.signal });
        } finally {
          clearTimeout(timeoutId);
        }
      };

      const translatedPairs = await Promise.all(
        noteEntries.map(async (entry) => {
          if (String(language || '').toLowerCase().startsWith('zh') && containsChinese(entry.value)) {
            return [entry.key, entry.value];
          }
          try {
            const res = await fetchWithTimeout(
              `${APP_API_BASE_URL}/api/app/translate`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  text: entry.value,
                  targetLanguage: language,
                }),
              },
              8000
            );
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) return [entry.key, entry.value];
            return [entry.key, String(payload?.translatedText || '').trim() || entry.value];
          } catch {
            return [entry.key, entry.value];
          }
        })
      );

      if (cancelled) return;
      setTranslatedNoteValues((prev) => {
        const next = Object.fromEntries(translatedPairs);
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
    };

    translateNotes();
    return () => {
      cancelled = true;
    };
  }, [visible, noteEntries, language]);

  if (!visible || !report) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <Text style={styles.title}>{t('medicalReport.title')}</Text>
              {activeReport.stage ? (
                <Text style={styles.stage}>{localizeMedicalStage(activeReport.stage, t)}</Text>
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
            showsVerticalScrollIndicator
          >
            {isEmptyPlaceholder ? (
              <View style={styles.emptyHintBox}>
                <Text style={styles.emptyHintText}>
                  {t('medicalReport.noCheckInForAppointment')}
                </Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('medicalReport.visitDate')}</Text>
              <Text style={styles.sectionValue}>{formatVisitDate(activeReport.visit_date)}</Text>
            </View>
            {reportData.visit_time ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('medicalReport.visitTime')}</Text>
                <Text style={styles.sectionValue}>{formatValue(reportData.visit_time)}</Text>
              </View>
            ) : null}

            {activeReport.provider_name ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('medicalReport.providerName')}</Text>
                <Text style={styles.sectionValue}>{activeReport.provider_name}</Text>
              </View>
            ) : null}

            {!isEmptyPlaceholder ? (
              <View style={styles.badgeRow}>
                <View style={uploadedByAdmin ? styles.adminBadge : styles.surrogateBadge}>
                  <Text style={uploadedByAdmin ? styles.adminBadgeText : styles.surrogateBadgeText}>
                    {uploadedByAdmin
                      ? t('medicalReport.adminUploaded')
                      : t('medicalReport.surrogateUploaded')}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('medicalReport.notes')}</Text>
              {noteEntries.length === 0 ? (
                <Text style={styles.notesEmpty}>—</Text>
              ) : (
                noteEntries.map((entry) => (
                  <View key={entry.key} style={styles.notesBox}>
                    {noteEntries.length > 1 ? (
                      <Text style={styles.notesSubLabel}>{entry.label}</Text>
                    ) : null}
                    <Text style={styles.notesValue}>{translatedNoteValues[entry.key] || entry.value}</Text>
                  </View>
                ))
              )}
            </View>

            {Object.entries(reportData)
              .filter(
                ([k, v]) =>
                  v != null &&
                  v !== '' &&
                  k !== 'provider_contact' &&
                  k !== 'visit_time' &&
                  !NOTE_KEYS.includes(k)
              )
              .map(([key, value]) => {
                const label = reportDataLabelMap[key] || key.replace(/_/g, ' ');
                return (
                  <View key={key} style={styles.section}>
                    <Text style={styles.sectionTitle}>{label}</Text>
                    <Text style={styles.sectionValue}>{formatLocalizedValue(key, value, t)}</Text>
                  </View>
                );
              })}

            {isEmptyPlaceholder ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('medicalReport.providerContact')}</Text>
                <Text style={styles.notesEmpty}>—</Text>
              </View>
            ) : reportData.provider_contact ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('medicalReport.providerContact')}</Text>
                <View style={styles.contactRow}>
                  <Icon name="phone" size={16} color="#64748B" />
                  <Icon name="mail" size={16} color="#64748B" style={{ marginLeft: 4 }} />
                  <Text style={[styles.sectionValue, { marginLeft: 4 }]}>
                    {formatValue(reportData.provider_contact)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('medicalReport.providerContact')}</Text>
                <View style={styles.contactRow}>
                  <Icon name="phone" size={16} color="#64748B" />
                  <Icon name="mail" size={16} color="#64748B" style={{ marginLeft: 4 }} />
                  <Text style={[styles.sectionValue, { marginLeft: 4 }]}>888888</Text>
                </View>
              </View>
            )}

            {activeReport.proof_image_url ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('medicalReport.uploadProof')}</Text>
                <Image
                  source={{ uri: activeReport.proof_image_url }}
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
 * Check-in detail for a completed appointment.
 * Only return a report when this appointment was claimed as a visit by check-in sync
 * (source_kind=visit). Auto-completed "next" rows still point at the PREVIOUS
 * check-in via source_medical_report_id — do not show that.
 */
export async function fetchMedicalReportForAppointment(supabase, appointment, userId) {
  if (!appointment || !userId) return null;

  if (String(appointment.source_kind || '') !== 'visit') {
    return null;
  }

  if (!appointment.source_medical_report_id) {
    return null;
  }

  const { data: bySource } = await supabase
    .from('medical_reports')
    .select('*')
    .eq('id', appointment.source_medical_report_id)
    .maybeSingle();

  return bySource || null;
}

/** Empty check-in shell shown until the surrogate submits one for this visit. */
export function buildEmptyCheckInForAppointment(appointment) {
  const visitDate = String(appointment?.appointment_date || '').slice(0, 10) || null;
  return {
    id: null,
    visit_date: visitDate,
    provider_name: appointment?.provider_name || null,
    stage: null,
    report_data: {},
    proof_image_url: null,
    uploaded_by: null,
    _emptyPlaceholder: true,
  };
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
    flexShrink: 1,
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
    flexGrow: 1,
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesBox: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F5E6B8',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  notesSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  notesValue: {
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 22,
  },
  notesEmpty: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
  },
  emptyHintBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  emptyHintText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
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
