import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Modal,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather as Icon } from '@expo/vector-icons';

const FORMATS = {
  'MM/DD/YYYY': {
    format: (d) =>
      `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`,
    parse: (s) => {
      const m = String(s || '').trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (!m) return null;
      const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
      return Number.isNaN(d.getTime()) ? null : d;
    },
  },
  'MM/DD/YY': {
    format: (d) =>
      `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`,
    parse: (s) => {
      const m = String(s || '').trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
      if (!m) return null;
      let year = Number(m[3]);
      if (year < 100) year += year >= 70 ? 1900 : 2000;
      const d = new Date(year, Number(m[1]) - 1, Number(m[2]));
      return Number.isNaN(d.getTime()) ? null : d;
    },
  },
  'MM-DD-YYYY': {
    format: (d) =>
      `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`,
    parse: (s) => {
      const m = String(s || '').trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (!m) return null;
      const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
      return Number.isNaN(d.getTime()) ? null : d;
    },
  },
  'YYYY-MM-DD': {
    format: (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    parse: (s) => {
      const m = String(s || '').trim().match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (!m) return null;
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return Number.isNaN(d.getTime()) ? null : d;
    },
  },
};

function parseFlexible(value, formatKey) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const primary = FORMATS[formatKey]?.parse(value);
  if (primary) return primary;
  for (const key of Object.keys(FORMATS)) {
    if (key === formatKey) continue;
    const parsed = FORMATS[key].parse(value);
    if (parsed) return parsed;
  }
  const native = new Date(value);
  return Number.isNaN(native.getTime()) ? null : native;
}

/**
 * Tap-to-open date picker that keeps the app's existing string date formats.
 */
export default function DatePickerField({
  value,
  onChange,
  format = 'MM/DD/YYYY',
  placeholder,
  style,
  textStyle,
  editable = true,
  maximumDate,
  minimumDate,
  /** Used when value is empty. Defaults to today (medical / appointment dates). */
  initialDate,
  /**
   * 'dob' opens near a typical adult birth year (~25 years ago).
   * Default 'date' opens on the current year (e.g. medical check-in).
   */
  variant = 'date',
  iconColor = '#94A3B8',
  iconSize = 18,
}) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(null);
  const formatter = FORMATS[format] || FORMATS['MM/DD/YYYY'];
  const parsed = useMemo(() => parseFlexible(value, format), [value, format]);

  const fallbackDate = useMemo(() => {
    if (initialDate instanceof Date && !Number.isNaN(initialDate.getTime())) {
      return initialDate;
    }
    if (variant === 'dob') {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 25);
      return d;
    }
    return new Date();
  }, [initialDate, variant]);

  const pickerValue = draftDate || parsed || fallbackDate;
  const display = value ? String(value) : '';

  const openPicker = () => {
    if (!editable) return;
    setDraftDate(parsed || fallbackDate);
    setOpen(true);
  };

  const commit = (date) => {
    if (!date || Number.isNaN(date.getTime())) return;
    onChange?.(formatter.format(date));
  };

  const onPickerChange = (event, selected) => {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event?.type === 'dismissed') return;
      if (selected) commit(selected);
      return;
    }
    if (selected) setDraftDate(selected);
  };

  const confirmIos = () => {
    commit(draftDate || pickerValue);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.field, !editable && styles.fieldDisabled, style]}
        onPress={openPicker}
        activeOpacity={editable ? 0.7 : 1}
        disabled={!editable}
      >
        <Text
          style={[
            styles.text,
            !display && styles.placeholder,
            !editable && styles.textDisabled,
            textStyle,
          ]}
          numberOfLines={1}
        >
          {display || placeholder || format}
        </Text>
        <Icon name="calendar" size={iconSize} color={iconColor} />
      </TouchableOpacity>

      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          onChange={onPickerChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setOpen(false)}
            />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmIos} hitSlop={12}>
                  <Text style={styles.modalAction}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="spinner"
                themeVariant="light"
                textColor="#0F172A"
                onChange={onPickerChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  fieldDisabled: {
    backgroundColor: '#F8FAFC',
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    marginRight: 8,
  },
  textDisabled: {
    color: '#64748B',
  },
  placeholder: {
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 28,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  modalCancel: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
  },
  modalAction: {
    color: '#1F6FE0',
    fontSize: 16,
    fontWeight: '600',
  },
  iosPicker: {
    width: '100%',
    height: 216,
    alignSelf: 'stretch',
    backgroundColor: '#fff',
  },
});
