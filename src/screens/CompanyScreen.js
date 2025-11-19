import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Image } from 'react-native';

export default function CompanyScreen() {
  const openWebsite = () => {
    Linking.openURL('https://babytreesurrogacy.com/');
  };

  const openEmail = () => {
    Linking.openURL('mailto:info@usababytree.com');
  };

  const openPhone = () => {
    Linking.openURL('tel:+1-888-245-1866');
  };

  const openAddress = () => {
    Linking.openURL('https://maps.google.com/?q=961+W+Holt+Blvd,+Ontario,+CA+91762');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Company Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>SA</Text>
          </View>
        </View>
        <Text style={styles.title}>Babytree Surrogacy</Text>
        <Text style={styles.subtitle}>#1 California Surrogacy Agency</Text>
      </View>

      {/* Company Introduction */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏢 About Our Company</Text>
        <Text style={styles.introText}>
          Babytree Surrogacy is a top-rated surrogacy agency in California, offering full-service 
          egg donor and surrogacy programs. We have extensive experience working with both domestic 
          and international clients from diverse backgrounds.
        </Text>
        <Text style={styles.introText}>
          As a professional and trusted mid-sized surrogacy agency, we have experience in working 
          with people from all different nationalities and backgrounds, providing comprehensive 
          support throughout the entire surrogacy journey.
        </Text>
      </View>

      {/* Company Website */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌐 Company Website</Text>
        <Text style={styles.websiteDescription}>
          Visit our official website for detailed information about our services, success stories, 
          and comprehensive resources.
        </Text>
        <TouchableOpacity style={styles.websiteButton} onPress={openWebsite}>
          <Text style={styles.websiteButtonText}>Visit Official Website</Text>
        </TouchableOpacity>
        <Text style={styles.websiteUrl}>babytreesurrogacy.com</Text>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📞 Contact Information</Text>
        
        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📞</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactLabel}>Phone</Text>
            <TouchableOpacity onPress={openPhone}>
              <Text style={styles.contactValue}>(888) 245-1866</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📧</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactLabel}>Email</Text>
            <TouchableOpacity onPress={openEmail}>
              <Text style={styles.contactValue}>info@usababytree.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📍</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactLabel}>Address</Text>
            <TouchableOpacity onPress={openAddress}>
              <Text style={styles.contactValue}>961 W Holt Blvd{'\n'}Ontario, CA 91762</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>🕒</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactLabel}>Business Hours</Text>
            <Text style={styles.contactValue}>Monday - Friday: 9:00 AM - 6:00 PM{'\n'}Saturday: 10:00 AM - 4:00 PM</Text>
          </View>
        </View>
      </View>

      {/* Certifications & Credentials */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Certifications & Credentials</Text>
        
        <View style={styles.certificationItem}>
          <Text style={styles.certificationIcon}>✅</Text>
          <View style={styles.certificationContent}>
            <Text style={styles.certificationTitle}>Licensed Surrogacy Agency</Text>
            <Text style={styles.certificationDescription}>
              Licensed by the State of California and NY
            </Text>
            <Text style={styles.certificationDate}>License #: SA-2024-001</Text>
          </View>
        </View>

        <View style={styles.certificationItem}>
          <Text style={styles.certificationIcon}>✅</Text>
          <View style={styles.certificationContent}>
            <Text style={styles.certificationTitle}>ASRM Member</Text>
            <Text style={styles.certificationDescription}>
              Active member of the American Society for Reproductive Medicine
            </Text>
            <Text style={styles.certificationDate}>Member Since: 2010</Text>
          </View>
        </View>

        <View style={styles.certificationItem}>
          <Text style={styles.certificationIcon}>✅</Text>
          <View style={styles.certificationContent}>
            <Text style={styles.certificationTitle}>HIPAA Compliant</Text>
            <Text style={styles.certificationDescription}>
              Fully compliant with Health Insurance Portability and Accountability Act
            </Text>
            <Text style={styles.certificationDate}>Certified: 2024</Text>
          </View>
        </View>


        <View style={styles.certificationItem}>
          <Text style={styles.certificationIcon}>✅</Text>
          <View style={styles.certificationContent}>
            <Text style={styles.certificationTitle}>International Surrogacy Network</Text>
            <Text style={styles.certificationDescription}>
              Member of the International Surrogacy Network for global coordination
            </Text>
            <Text style={styles.certificationDate}>Member Since: 2015</Text>
          </View>
        </View>
      </View>

      {/* Company Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Company Statistics</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>1,000+</Text>
            <Text style={styles.statLabel}>Successful Journeys</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>14+</Text>
            <Text style={styles.statLabel}>Years Experience</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>98%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>
      </View>

      {/* Mission Statement */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Our Mission</Text>
        <Text style={styles.missionText}>
          "To provide compassionate, professional, and comprehensive surrogacy services that 
          help intended parents and surrogates create beautiful families while maintaining 
          the highest standards of care, ethics, and support throughout the journey."
        </Text>
      </View>

      {/* Emergency Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚨 Emergency Contact</Text>
        <Text style={styles.emergencyDescription}>
          For urgent matters outside business hours, our emergency hotline is available 24/7.
        </Text>
        <TouchableOpacity style={styles.emergencyButton} onPress={() => Linking.openURL('tel:+1-888-245-1866')}>
          <Text style={styles.emergencyButtonText}>Emergency Hotline: (888) 245-1866</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 60,
  },
  header: {
    backgroundColor: '#2A7BF6',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoText: {
    color: '#2A7BF6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F4FD',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2A7BF6',
    marginBottom: 16,
  },
  introText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  websiteDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  websiteButton: {
    backgroundColor: '#2A7BF6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  websiteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  websiteUrl: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactIcon: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 2,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    color: '#2A7BF6',
    lineHeight: 22,
  },
  certificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  certificationIcon: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 2,
  },
  certificationContent: {
    flex: 1,
  },
  certificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  certificationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  certificationDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2A7BF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  missionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emergencyDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  emergencyButton: {
    backgroundColor: '#DC3545',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});