import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  SafeAreaView,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function CustomerServiceScreen({ navigation }) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'Unable to make phone call');
    });
  };

  const handleEmail = (email) => {
    Linking.openURL(`mailto:${email}?subject=Customer Service Inquiry`).catch(() => {
      Alert.alert('Error', 'Unable to open email client');
    });
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in both subject and message');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement actual API call to submit support ticket
      // For now, we'll simulate a submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Success',
        'Your message has been submitted. Our team will get back to you within 24 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              setSubject('');
              setMessage('');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqItems = [
    {
      question: 'How do I update my profile information?',
      answer: 'You can update your profile information in the User Center under "My Info".',
    },
    {
      question: 'How do I view my matched surrogate/parent?',
      answer: 'Go to "My Match" tab to view your matched partner and related documents.',
    },
    {
      question: 'How do I submit medical check-in reports?',
      answer: 'In "My Journey" tab, click "Add Medical Check-in" button to submit your reports.',
    },
    {
      question: 'What documents do I need to upload?',
      answer: 'Required documents include contracts, insurance policies, and medical records. Check "My Match" for details.',
    },
    {
      question: 'How do I contact my matched partner?',
      answer: 'You can view your partner\'s contact information in "My Match" tab under "Intended Parents Profile".',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Contact Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleCall('1-800-123-4567')}
          >
            <View style={styles.contactIconContainer}>
              <Icon name="phone" size={24} color="#2A7BF6" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>1-800-123-4567</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleEmail('support@surrogateagency.com')}
          >
            <View style={styles.contactIconContainer}>
              <Icon name="mail" size={24} color="#2A7BF6" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>support@surrogateagency.com</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#CCC" />
          </TouchableOpacity>

          <View style={styles.contactItem}>
            <View style={styles.contactIconContainer}>
              <Icon name="clock" size={24} color="#2A7BF6" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Business Hours</Text>
              <Text style={styles.contactValue}>Monday - Friday: 9:00 AM - 6:00 PM EST</Text>
              <Text style={styles.contactValue}>Saturday: 10:00 AM - 4:00 PM EST</Text>
              <Text style={styles.contactValue}>Sunday: Closed</Text>
            </View>
          </View>
        </View>

        {/* Submit Ticket Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submit a Support Ticket</Text>
          <Text style={styles.sectionDescription}>
            Fill out the form below and our team will respond within 24 hours.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter subject"
              value={subject}
              onChangeText={setSubject}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your issue or question"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          {faqItems.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
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
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#2A7BF6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  faqItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
