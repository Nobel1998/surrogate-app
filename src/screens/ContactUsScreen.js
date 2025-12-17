import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { Feather as Icon } from '@expo/vector-icons';

export default function ContactUsScreen({ navigation }) {
  const { t } = useLanguage();

  const contactMethods = [
    {
      id: 'manager1',
      name: t('contactUs.manager1.name'),
      title: t('contactUs.manager1.title'),
      phone: '+1-888-245-1866',
      email: 'info@usababytree.com',
    },
    {
      id: 'manager2',
      name: t('contactUs.manager2.name'),
      title: t('contactUs.manager2.title'),
      phone: '+1-888-245-1866',
      email: 'support@usababytree.com',
    },
    {
      id: 'manager3',
      name: t('contactUs.manager3.name'),
      title: t('contactUs.manager3.title'),
      phone: '+1-888-245-1866',
      email: 'care@usababytree.com',
    },
  ];

  const openPhone = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const openEmail = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

  const renderContactCard = (manager) => (
    <View key={manager.id} style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={styles.avatarContainer}>
          <Icon name="user" size={32} color="#2A7BF6" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.managerName}>{manager.name}</Text>
          <Text style={styles.managerTitle}>{manager.title}</Text>
        </View>
      </View>

      <View style={styles.contactMethods}>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => openPhone(manager.phone)}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}>
            <Icon name="phone" size={20} color="#fff" />
          </View>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonLabel}>{t('contactUs.phone')}</Text>
            <Text style={styles.buttonValue}>{manager.phone}</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => openEmail(manager.email)}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#2196F3' }]}>
            <Icon name="mail" size={20} color="#fff" />
          </View>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonLabel}>{t('contactUs.email')}</Text>
            <Text style={styles.buttonValue}>{manager.email}</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('contactUs.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>{t('contactUs.introTitle')}</Text>
          <Text style={styles.introText}>{t('contactUs.introText')}</Text>
        </View>

        {/* Contact Managers */}
        <View style={styles.managersSection}>
          <Text style={styles.sectionTitle}>{t('contactUs.ourManagers')}</Text>
          {contactMethods.map(renderContactCard)}
        </View>

        {/* General Contact Info */}
        <View style={styles.generalSection}>
          <Text style={styles.sectionTitle}>{t('contactUs.generalContact')}</Text>
          <View style={styles.generalCard}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => openPhone('+1-888-245-1866')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}>
                <Icon name="phone" size={20} color="#fff" />
              </View>
              <View style={styles.buttonContent}>
                <Text style={styles.buttonLabel}>{t('contactUs.phone')}</Text>
                <Text style={styles.buttonValue}>+1-888-245-1866</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => openEmail('info@usababytree.com')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#2196F3' }]}>
                <Icon name="mail" size={20} color="#fff" />
              </View>
              <View style={styles.buttonContent}>
                <Text style={styles.buttonLabel}>{t('contactUs.email')}</Text>
                <Text style={styles.buttonValue}>info@usababytree.com</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => Linking.openURL('https://maps.google.com/?q=961+W+Holt+Blvd,+Ontario,+CA+91762')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FF9800' }]}>
                <Icon name="map-pin" size={20} color="#fff" />
              </View>
              <View style={styles.buttonContent}>
                <Text style={styles.buttonLabel}>{t('contactUs.address')}</Text>
                <Text style={styles.buttonValue}>961 W Holt Blvd, Ontario, CA 91762</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
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
  managerTitle: {
    fontSize: 14,
    color: '#666',
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
