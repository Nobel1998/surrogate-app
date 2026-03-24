import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';

/**
 * Bottom-sheet style modal to pick which surrogate match is active (parent only).
 */
export default function ParentMatchSwitcher({
  visible,
  onClose,
  matches = [],
  activeMatchId,
  surrogateNames = {},
  onSelectMatch,
}) {
  const renderItem = ({ item }) => {
    const sid = item.surrogate_id;
    const name = (sid && surrogateNames[sid]) || 'Surrogate';
    const selected = item.id === activeMatchId;
    return (
      <TouchableOpacity
        style={[styles.row, selected && styles.rowSelected]}
        onPress={() => {
          onSelectMatch(item.id);
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {item.status ? String(item.status) : ''}
            {item.transfer_date ? ` · Transfer ${item.transfer_date}` : ''}
          </Text>
        </View>
        {selected ? (
          <Icon name="check-circle" size={22} color="#2A7BF6" />
        ) : (
          <Icon name="chevron-right" size={20} color="#A0A3BD" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <SafeAreaView style={styles.sheetWrap}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Switch surrogate</Text>
                <TouchableOpacity onPress={onClose} hitSlop={12}>
                  <Icon name="x" size={22} color="#6E7191" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={matches}
                keyExtractor={(m) => m.id}
                renderItem={renderItem}
                ListEmptyComponent={
                  <Text style={styles.empty}>No active matches</Text>
                }
              />
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    maxHeight: '55%',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ECECEC',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#14142B',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F4F4F4',
  },
  rowSelected: {
    backgroundColor: '#F0F7FF',
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14142B',
  },
  rowSub: {
    fontSize: 13,
    color: '#6E7191',
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    color: '#6E7191',
    padding: 24,
  },
});
