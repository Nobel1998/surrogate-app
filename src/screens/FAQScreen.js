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
import { useLanguage } from '../context/LanguageContext';

export default function FAQScreen({ navigation }) {
  const { t } = useLanguage();
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleFAQ = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const faqItems = [
    {
      category: t('faq.categories.general'),
      questions: [
        {
          question: t('faq.questions.general.updateProfile.question'),
          answer: t('faq.questions.general.updateProfile.answer'),
        },
        {
          question: t('faq.questions.general.viewMatch.question'),
          answer: t('faq.questions.general.viewMatch.answer'),
        },
        {
          question: t('faq.questions.general.forgotPassword.question'),
          answer: t('faq.questions.general.forgotPassword.answer'),
        },
      ],
    },
    {
      category: t('faq.categories.medical'),
      questions: [
        {
          question: t('faq.questions.medical.submitCheckin.question'),
          answer: t('faq.questions.medical.submitCheckin.answer'),
        },
        {
          question: t('faq.questions.medical.checkinInfo.question'),
          answer: t('faq.questions.medical.checkinInfo.answer'),
        },
        {
          question: t('faq.questions.medical.viewCheckins.question'),
          answer: t('faq.questions.medical.viewCheckins.answer'),
        },
      ],
    },
    {
      category: t('faq.categories.documents'),
      questions: [
        {
          question: t('faq.questions.documents.uploadDocuments.question'),
          answer: t('faq.questions.documents.uploadDocuments.answer'),
        },
        {
          question: t('faq.questions.documents.accessDocuments.question'),
          answer: t('faq.questions.documents.accessDocuments.answer'),
        },
        {
          question: t('faq.questions.documents.fileFormats.question'),
          answer: t('faq.questions.documents.fileFormats.answer'),
        },
      ],
    },
    {
      category: t('faq.categories.matching'),
      questions: [
        {
          question: t('faq.questions.matching.contactPartner.question'),
          answer: t('faq.questions.matching.contactPartner.answer'),
        },
        {
          question: t('faq.questions.matching.matchingTime.question'),
          answer: t('faq.questions.matching.matchingTime.answer'),
        },
        {
          question: t('faq.questions.matching.matchStatus.question'),
          answer: t('faq.questions.matching.matchStatus.answer'),
        },
      ],
    },
    {
      category: t('faq.categories.account'),
      questions: [
        {
          question: t('faq.questions.account.notificationPreferences.question'),
          answer: t('faq.questions.account.notificationPreferences.answer'),
        },
        {
          question: t('faq.questions.account.applicationHistory.question'),
          answer: t('faq.questions.account.applicationHistory.answer'),
        },
        {
          question: t('faq.questions.account.signOut.question'),
          answer: t('faq.questions.account.signOut.answer'),
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
        <Text style={styles.headerTitle}>{t('faq.title')}</Text>
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
          <Text style={styles.contactTitle}>{t('faq.contactSupport')}</Text>
          <Text style={styles.contactDescription}>
            {t('faq.ifYouHaveQuestions')}
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => navigation.navigate('CustomerService')}
          >
            <Icon name="message-circle" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>{t('profile.customerService')}</Text>
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

