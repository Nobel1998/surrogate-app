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

function parseTimeToDate(value) {
  const s = String(value || '').trim();
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m24) {
    const h = Math.min(23, Math.max(0, parseInt(m24[1], 10)));
    const min = Math.min(59, Math.max(0, parseInt(m24[2], 10)));
    const d = new Date();
    d.setHours(h, min, 0, 0);
    return d;
  }
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10) % 12;
    if (m12[3].toLowerCase() === 'pm') h += 12;
    const min = parseInt(m12[2], 10);
    const d = new Date();
    d.setHours(h, min, 0, 0);
    return d;
  }
  return null;
}

function formatTimeValue(date, use12Hour) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const h24 = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  if (!use12Hour) {
    return `${String(h24).padStart(2, '0')}:${min}`;
  }
  const suffix = h24 >= 12 ? 'pm' : 'am';
  const h12 = h24 % 12 || 12;
  return `${h12}:${min} ${suffix}`;
}

/**
 * Tap-to-open time picker. Stores "HH:MM" (24h) by default.
 */
export default function TimePickerField({
  value,
  onChange,
  placeholder = 'Select time',
  style,
  textStyle,
  editable = true,
  /** Display/store as 12-hour "h:mm am/pm" when true; otherwise "HH:MM". */
  use12Hour = false,
  iconColor = '#94A3B8',
  iconSize = 18,
}) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(null);

  const parsed = useMemo(() => parseTimeToDate(value), [value]);
  const fallbackDate = useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d;
  }, []);

  const pickerValue = draftDate || parsed || fallbackDate;
  const display = value ? String(value) : '';

  const openPicker = () => {
    if (!editable) return;
    setDraftDate(parsed || fallbackDate);
    setOpen(true);
  };

  const commit = (date) => {
    if (!date || Number.isNaN(date.getTime())) return;
    onChange?.(formatTimeValue(date, use12Hour));
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
          {display || placeholder}
        </Text>
        <Icon name="clock" size={iconSize} color={iconColor} />
      </TouchableOpacity>

      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          display="default"
          is24Hour={!use12Hour}
          onChange={onPickerChange}
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
                mode="time"
                display="spinner"
                themeVariant="light"
                textColor="#0F172A"
                is24Hour={!use12Hour}
                onChange={onPickerChange}
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
