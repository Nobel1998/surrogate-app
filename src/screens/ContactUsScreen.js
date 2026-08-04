import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { Feather as Icon } from '@expo/vector-icons';
import { APP_API_BASE_URL } from '../constants/api';
import { supabase } from '../lib/supabase';

const CODE_ORDER = ['main', 'high_desert', 'coachella_valley', 'antelope_valley', 'san_diego'];

const FALLBACK_OFFICES = [
  {
    id: 'main',
    code: 'main',
    nameKey: 'contactUs.officeMain.name',
    phone: '(888) 245-1866',
    email: 'info@babytreesurrogacy.com',
    address: '961 W Holt Blvd, Ontario, CA 91762',
  },
  {
    id: 'highDesert',
    code: 'high_desert',
    nameKey: 'contactUs.officeHighDesert.name',
    phone: '(760) 223-7500',
    email: 'highdesert@babytreesurrogacy.com',
    address: null,
  },
  {
    id: 'coachellaValley',
    code: 'coachella_valley',
    nameKey: 'contactUs.officeCoachellaValley.name',
    phone: '(760) 904-2600',
    email: 'coachellavalley@babytreesurrogacy.com',
    address: null,
  },
  {
    id: 'antelopeValley',
    code: 'antelope_valley',
    nameKey: 'contactUs.officeAntelopeValley.name',
    phone: '(661) 471-3100',
    email: 'antelopevalley@babytreesurrogacy.com',
    address: null,
  },
  {
    id: 'sanDiego',
    code: 'san_diego',
    nameKey: 'contactUs.officeSanDiego.name',
    phone: '(619) 396-9214',
    email: 'sandiego@babytreesurrogacy.com',
    address: null,
  },
];

const NAME_KEY_BY_CODE = {
  main: 'contactUs.officeMain.name',
  high_desert: 'contactUs.officeHighDesert.name',
  coachella_valley: 'contactUs.officeCoachellaValley.name',
  antelope_valley: 'contactUs.officeAntelopeValley.name',
  san_diego: 'contactUs.officeSanDiego.name',
};

function sortBranches(list) {
  return [...list].sort((a, b) => {
    const ai = CODE_ORDER.indexOf(String(a.code || '').toLowerCase());
    const bi = CODE_ORDER.indexOf(String(b.code || '').toLowerCase());
    const aRank = ai === -1 ? CODE_ORDER.length : ai;
    const bRank = bi === -1 ? CODE_ORDER.length : bi;
    if (aRank !== bRank) return aRank - bRank;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export default function ContactUsScreen({ navigation }) {
  const { t } = useLanguage();
  const [offices, setOffices] = useState(FALLBACK_OFFICES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const resolveOfficeName = useCallback(
    (office) => {
      if (office?.nameKey) return t(office.nameKey);
      const key = NAME_KEY_BY_CODE[String(office?.code || '').toLowerCase()];
      if (key) return t(key);
      return office?.name || t('contactUs.ourOffices');
    },
    [t]
  );

  const loadOffices = useCallback(async () => {
    try {
      let rows = null;

      try {
        const res = await fetch(`${APP_API_BASE_URL}/api/app/branches`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.branches) && data.branches.length > 0) {
            rows = data.branches;
          }
        }
      } catch (apiError) {
        console.warn('[ContactUs] API branches fetch failed:', apiError?.message || apiError);
      }

      if (!rows) {
        const { data, error } = await supabase
          .from('branches')
          .select('id, name, code, address, phone, email')
          .order('name', { ascending: true });
        if (error) throw error;
        if (Array.isArray(data) && data.length > 0) {
          rows = data;
        }
      }

      if (!rows?.length) {
        setOffices(FALLBACK_OFFICES);
        return;
      }

      setOffices(
        sortBranches(rows).map((branch) => ({
          id: branch.id || branch.code,
          code: branch.code,
          name: branch.name,
          phone: branch.phone || '',
          email: branch.email || '',
          address: branch.address || null,
        }))
      );
    } catch (error) {
      console.warn('[ContactUs] load offices failed, using fallback:', error?.message || error);
      setOffices(FALLBACK_OFFICES);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadOffices();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadOffices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOffices();
    setRefreshing(false);
  }, [loadOffices]);

  const mainOffice = useMemo(() => {
    const byCode = offices.find((o) => String(o.code || '').toLowerCase() === 'main');
    return byCode || offices[0] || FALLBACK_OFFICES[0];
  }, [offices]);

  const openPhone = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[()\s-]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const openEmail = (email) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`);
  };

  const renderOfficeCard = (office) => (
    <View key={office.id} style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={styles.avatarContainer}>
          <Icon name="map-pin" size={32} color="#2A7BF6" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.managerName}>{resolveOfficeName(office)}</Text>
        </View>
      </View>

      <View style={styles.contactMethods}>
        {!!office.phone && (
          <TouchableOpacity style={styles.contactButton} onPress={() => openPhone(office.phone)}>
            <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}>
              <Icon name="phone" size={20} color="#fff" />
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonLabel}>{t('contactUs.phone')}</Text>
              <Text style={styles.buttonValue}>{office.phone}</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
        )}

        {!!office.email && (
          <TouchableOpacity style={styles.contactButton} onPress={() => openEmail(office.email)}>
            <View style={[styles.iconContainer, { backgroundColor: '#2196F3' }]}>
              <Icon name="mail" size={20} color="#fff" />
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonLabel}>{t('contactUs.email')}</Text>
              <Text style={styles.buttonValue}>{office.email}</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('contactUs.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>{t('contactUs.introTitle')}</Text>
          <Text style={styles.introText}>{t('contactUs.introText')}</Text>
        </View>

        <View style={styles.managersSection}>
          <Text style={styles.sectionTitle}>{t('contactUs.ourOffices')}</Text>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#2A7BF6" />
            </View>
          ) : (
            offices.map(renderOfficeCard)
          )}
        </View>

        <View style={styles.generalSection}>
          <Text style={styles.sectionTitle}>{t('contactUs.generalContact')}</Text>
          <View style={styles.generalCard}>
            {!!mainOffice.phone && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => openPhone(mainOffice.phone)}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}>
                  <Icon name="phone" size={20} color="#fff" />
                </View>
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonLabel}>{t('contactUs.phone')}</Text>
                  <Text style={styles.buttonValue}>{mainOffice.phone}</Text>
                  <Text style={styles.buttonSubtext}>{t('contactUs.tollFree')}</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            )}

            {!!mainOffice.email && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => openEmail(mainOffice.email)}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#2196F3' }]}>
                  <Icon name="mail" size={20} color="#fff" />
                </View>
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonLabel}>{t('contactUs.email')}</Text>
                  <Text style={styles.buttonValue}>{mainOffice.email}</Text>
                  <Text style={styles.buttonSubtext}>{t('contactUs.generalInquiries')}</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            )}

            {!!mainOffice.address && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() =>
                  Linking.openURL(
                    `https://maps.google.com/?q=${encodeURIComponent(mainOffice.address)}`
                  )
                }
              >
                <View style={[styles.iconContainer, { backgroundColor: '#FF9800' }]}>
                  <Icon name="map-pin" size={20} color="#fff" />
                </View>
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonLabel}>{t('contactUs.address')}</Text>
                  <Text style={styles.buttonValue}>{mainOffice.address}</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            )}

            <View style={styles.contactButton}>
              <View style={[styles.iconContainer, { backgroundColor: '#9E9E9E' }]}>
                <Icon name="printer" size={20} color="#fff" />
              </View>
              <View style={styles.buttonContent}>
                <Text style={styles.buttonLabel}>{t('contactUs.fax')}</Text>
                <Text style={styles.buttonValue}>(626) 658-8958</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    backgroundColor: '#2A7BF6',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  introSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
    marginHorizontal: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  introText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  managersSection: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  contactCard: {
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
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  managerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  contactMethods: {
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FB',
    borderRadius: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buttonContent: {
    flex: 1,
  },
  buttonLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  buttonValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  buttonSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  generalSection: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  generalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
});
