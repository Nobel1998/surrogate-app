import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';

export default function ProtectionScreen() {
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const openEmail = () => {
    Linking.openURL('mailto:info@usababytree.com?subject=Surrogate Protection Inquiry');
  };

  const openPhone = () => {
    Linking.openURL('tel:888-245-1866');
  };

  const openWebsite = () => {
    Linking.openURL('https://babytreesurrogacy.com');
  };

  const faqData = [
    {
      question: "What insurance coverage do I have as a surrogate?",
      answer: "You are covered by comprehensive medical insurance throughout the entire surrogacy process, including pregnancy, delivery, and post-partum care. This includes all medical expenses, complications, and follow-up care."
    },
    {
      question: "What happens if there are medical complications?",
      answer: "All medical complications are fully covered by our insurance. You will receive the best medical care available, and all expenses will be handled by our insurance provider. We also provide 24/7 medical support."
    },
    {
      question: "How am I protected legally?",
      answer: "You have access to independent legal counsel throughout the process. All legal documents are reviewed by your own attorney, and you have the right to withdraw at any time before embryo transfer without penalty."
    },
    {
      question: "What financial protection do I have?",
      answer: "Your compensation is guaranteed and protected by escrow accounts. You receive monthly payments throughout the pregnancy, and all expenses (medical, travel, maternity clothes) are reimbursed. Life insurance is also provided."
    },
    {
      question: "What if the intended parents change their mind?",
      answer: "You are fully protected. Your compensation continues, and you have the right to make decisions about the pregnancy. Our legal team ensures your rights are protected throughout the process."
    },
    {
      question: "How do I get support during the process?",
      answer: "You have access to 24/7 support hotline, dedicated case manager, counseling services, and support groups. We also provide regular check-ins and medical monitoring."
    }
  ];

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={true}
      bounces={true}
      scrollEventThrottle={16}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.title}>🛡️ Best Protection Program</Text>
      <Text style={styles.subtitle}>Created from past surrogates' feedback to ensure your well-being and security</Text>
      
      {/* Best Protection Program */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛡️ Comprehensive Protection Guarantees</Text>
        
        <View style={styles.protectionItem}>
          <Text style={styles.protectionIcon}>💳</Text>
          <View style={styles.protectionContent}>
            <Text style={styles.protectionTitle}>No Medical Bill Liability</Text>
            <Text style={styles.protectionDescription}>
              We take full responsibility for any medical bills that arise after the trust account is closed. 
              If intended parents refuse to pay any relevant bills (including insurance liens), we will settle them.
            </Text>
          </View>
        </View>

        <View style={styles.protectionItem}>
          <Text style={styles.protectionIcon}>🔄</Text>
          <View style={styles.protectionContent}>
            <Text style={styles.protectionTitle}>Continuity of Care</Text>
            <Text style={styles.protectionDescription}>
              In the event of a failed transfer or miscarriage, we will rematch you with new intended parents 
              to continue your surrogacy journey.
            </Text>
          </View>
        </View>

        <View style={styles.protectionItem}>
          <Text style={styles.protectionIcon}>💰</Text>
          <View style={styles.protectionContent}>
            <Text style={styles.protectionTitle}>Timely and Full Payment</Text>
            <Text style={styles.protectionDescription}>
              We guarantee that you receive your payments on time and in full. Your financial security 
              is our priority throughout the entire process.
            </Text>
          </View>
        </View>

        <View style={styles.protectionItem}>
          <Text style={styles.protectionIcon}>👶</Text>
          <View style={styles.protectionContent}>
            <Text style={styles.protectionTitle}>Protection in Difficult Circumstances</Text>
            <Text style={styles.protectionDescription}>
              If intended parents abandon the child or request an abortion you're not comfortable with, 
              we will find an adoptive family and ensure you receive your full compensation if you choose 
              to continue the pregnancy.
            </Text>
          </View>
        </View>

        <View style={styles.protectionItem}>
          <Text style={styles.protectionIcon}>🏥</Text>
          <View style={styles.protectionContent}>
            <Text style={styles.protectionTitle}>Health Safeguards</Text>
            <Text style={styles.protectionDescription}>
              Additional compensation provided if paired with Hepatitis B positive intended parents ($3,000) 
              or HIV positive intended parents ($10,000), regardless of transfer success. 
              This acknowledges the added considerations in such cases.
            </Text>
          </View>
        </View>

        <View style={styles.protectionItem}>
          <Text style={styles.protectionIcon}>🔒</Text>
          <View style={styles.protectionContent}>
            <Text style={styles.protectionTitle}>Privacy Protection</Text>
            <Text style={styles.protectionDescription}>
              Your privacy is paramount. We will always seek your full permission before sharing 
              any of your information on social media or other platforms.
            </Text>
          </View>
        </View>

        <View style={styles.protectionItem}>
          <Text style={styles.protectionIcon}>⚖️</Text>
          <View style={styles.protectionContent}>
            <Text style={styles.protectionTitle}>Legal Protection</Text>
            <Text style={styles.protectionDescription}>
              Independent legal counsel provided. All contracts reviewed by your own attorney. 
              Your rights are protected throughout the entire journey.
            </Text>
          </View>
        </View>

        <View style={styles.protectionItem}>
          <Text style={styles.protectionIcon}>📞</Text>
          <View style={styles.protectionContent}>
            <Text style={styles.protectionTitle}>24/7 Emergency Support</Text>
            <Text style={styles.protectionDescription}>
              Round-the-clock emergency hotline with immediate response. 
              Your safety and well-being are our top priorities at all times.
            </Text>
          </View>
        </View>
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>❓ Frequently Asked Questions</Text>
        {faqData.map((faq, index) => (
          <TouchableOpacity 
            key={index}
            style={styles.faqItem}
            onPress={() => toggleFAQ(index)}
            activeOpacity={0.7}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <Text style={styles.faqToggle}>
                {expandedFAQ === index ? '−' : '+'}
              </Text>
            </View>
            {expandedFAQ === index && (
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📞 Contact & Support</Text>
        
        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📧</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>Email Support</Text>
            <TouchableOpacity onPress={openEmail}>
              <Text style={styles.contactLink}>info@usababytree.com</Text>
            </TouchableOpacity>
            <Text style={styles.contactDescription}>24/7 email support for all your questions</Text>
          </View>
        </View>

        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📱</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>Phone Support</Text>
            <TouchableOpacity onPress={openPhone}>
              <Text style={styles.contactLink}>888-245-1866</Text>
            </TouchableOpacity>
            <Text style={styles.contactDescription}>Emergency hotline available 24/7</Text>
          </View>
        </View>

        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>🌐</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>Website</Text>
            <TouchableOpacity onPress={openWebsite}>
              <Text style={styles.contactLink}>babytreesurrogacy.com</Text>
            </TouchableOpacity>
            <Text style={styles.contactDescription}>Visit our website for more information</Text>
          </View>
        </View>

        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📍</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>Office Address</Text>
            <Text style={styles.contactAddress}>
              123 Surrogate Avenue{'\n'}
              Suite 456{'\n'}
              New York, NY 10001
            </Text>
            <Text style={styles.contactDescription}>Visit us during business hours (9 AM - 6 PM EST)</Text>
          </View>
        </View>
      </View>

      {/* Emergency Contact */}
      <View style={styles.emergencySection}>
        <Text style={styles.emergencyTitle}>🚨 Emergency Contact</Text>
        <Text style={styles.emergencyDescription}>
          If you have any medical emergencies or urgent concerns, call our 24/7 emergency hotline immediately.
        </Text>
        <TouchableOpacity style={styles.emergencyButton} onPress={openPhone}>
          <Text style={styles.emergencyButtonText}>📞 Call Emergency Hotline</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FB' 
  },
  scrollContent: {
    paddingBottom: 60,
    paddingTop: 60,
    flexGrow: 1
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
    color: '#2A7BF6'
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 20,
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic'
  },
  section: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginHorizontal: 16, 
    marginBottom: 16, 
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#2A7BF6', 
    marginBottom: 16 
  },
  
  // Protection Measures Styles
  protectionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  protectionIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2
  },
  protectionContent: {
    flex: 1
  },
  protectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6
  },
  protectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  
  // FAQ Styles
  faqItem: {
    backgroundColor: '#F8F9FB',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 12
  },
  faqToggle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2A7BF6'
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  
  // Contact Styles
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  contactIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2
  },
  contactContent: {
    flex: 1
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6
  },
  contactLink: {
    fontSize: 14,
    color: '#2A7BF6',
    textDecorationLine: 'underline',
    marginBottom: 4
  },
  contactAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4
  },
  contactDescription: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic'
  },
  
  // Emergency Section
  emergencySection: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE69C'
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8
  },
  emergencyDescription: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 16
  },
  emergencyButton: {
    backgroundColor: '#DC3545',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
}); 