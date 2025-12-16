import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';

export default function FAQScreen({ navigation }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleFAQ = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const faqItems = [
    {
      category: 'General',
      questions: [
        {
          question: 'How do I update my profile information?',
          answer: 'You can update your profile information in the User Center under "My Info". Simply tap on any field you want to edit, make your changes, and tap "Save" to update your information.',
        },
        {
          question: 'How do I view my matched surrogate/parent?',
          answer: 'Go to the "My Match" tab in the bottom navigation to view your matched partner and all related documents. You can see their profile, contact information, and shared documents.',
        },
        {
          question: 'What should I do if I forget my password?',
          answer: 'On the login screen, tap "Forgot Password?" and enter your email address. You will receive an email with instructions to reset your password.',
        },
      ],
    },
    {
      category: 'Medical Check-ins',
      questions: [
        {
          question: 'How do I submit medical check-in reports?',
          answer: 'In the "My Journey" tab, click the "Add Medical Check-in" button. Select your current stage (Pre-Transfer, Post-Transfer, or OB Office Visit), fill in the required information, upload any proof documents, and submit.',
        },
        {
          question: 'What information do I need for medical check-ins?',
          answer: 'The required information varies by stage. Pre-Transfer requires lab results and ultrasound data. Post-Transfer requires Beta HCG, fetal heart rate, and gestational sac measurements. OB Office Visit requires weight, blood pressure, and other routine check-up data.',
        },
        {
          question: 'Can I view my previous medical check-ins?',
          answer: 'Yes, all your medical check-ins are displayed in the "My Journey" timeline. You can scroll through your history and view details of each check-in.',
        },
      ],
    },
    {
      category: 'Documents',
      questions: [
        {
          question: 'What documents do I need to upload?',
          answer: 'Required documents include contracts (Surrogacy Contract, Attorney Retainer Agreement), insurance policies (Life Insurance, Health Insurance), and legal documents (PBO). Check "My Match" for a complete list of required documents.',
        },
        {
          question: 'How do I access my documents?',
          answer: 'All documents are available in the "My Match" tab under "Documents & Records". Tap on any document to view or download it.',
        },
        {
          question: 'What file formats are supported for document uploads?',
          answer: 'Supported formats include PDF, DOC, DOCX, and TXT files. Make sure your files are clear and readable before uploading.',
        },
      ],
    },
    {
      category: 'Matching Process',
      questions: [
        {
          question: 'How do I contact my matched partner?',
          answer: 'You can view your partner\'s contact information in the "My Match" tab under "Intended Parents Profile" (for surrogates) or by viewing the matched surrogate\'s profile. You can call or email them directly from the app.',
        },
        {
          question: 'How long does the matching process take?',
          answer: 'The matching process typically takes 2-4 weeks after your profile is approved. Our team carefully reviews profiles to ensure the best possible match for both parties.',
        },
        {
          question: 'Can I see my match status?',
          answer: 'Yes, your match status is displayed in the "My Match" tab. If you are matched, you will see your partner\'s information and shared documents. If not matched yet, you will see a "Matching in Progress" message.',
        },
      ],
    },
    {
      category: 'Account & Settings',
      questions: [
        {
          question: 'How do I change my notification preferences?',
          answer: 'Go to User Center > Notification Preferences. You can toggle push notifications, email notifications, and SMS notifications on or off.',
        },
        {
          question: 'How do I view my application history?',
          answer: 'In the User Center, tap on "Application History" to view all your submitted applications, their status, and details.',
        },
        {
          question: 'How do I sign out?',
          answer: 'Go to User Center and scroll to the bottom. Tap "Sign Out" to log out of your account.',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {faqItems.map((category, categoryIndex) => (
          <View key={categoryIndex} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.category}</Text>
            {category.questions.map((item, itemIndex) => {
              const globalIndex = faqItems
                .slice(0, categoryIndex)
                .reduce((sum, cat) => sum + cat.questions.length, 0) + itemIndex;
              const isExpanded = expandedIndex === globalIndex;

              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.faqItem}
                  onPress={() => toggleFAQ(globalIndex)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <Icon
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#666"
                    />
                  </View>
                  {isExpanded && (
                    <View style={styles.faqAnswerContainer}>
                      <Text style={styles.faqAnswer}>{item.answer}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Contact Support Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still have questions?</Text>
          <Text style={styles.contactDescription}>
            If you can't find the answer you're looking for, our support team is here to help.
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => navigation.navigate('CustomerService')}
          >
            <Icon name="message-circle" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>Contact Customer Service</Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  categorySection: {
    marginTop: 10,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  faqItem: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  faqAnswerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
    marginHorizontal: 10,
    marginBottom: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  contactDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A7BF6',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
