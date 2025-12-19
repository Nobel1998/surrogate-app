import React, { useState, useEffect } from 'react';
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
  RefreshControl,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

export default function CustomerServiceScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketDetail, setShowTicketDetail] = useState(false);

  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert(t('common.error'), t('customerService.unableToCall'));
    });
  };

  const handleEmail = (email) => {
    const subject = encodeURIComponent(t('customerService.title'));
    Linking.openURL(`mailto:${email}?subject=${subject}`).catch(() => {
      Alert.alert(t('common.error'), t('customerService.unableToEmail'));
    });
  };

  const handleAddress = () => {
    Linking.openURL('https://maps.google.com/?q=961+W+Holt+Blvd,+Ontario,+CA+91762').catch(() => {
      Alert.alert(t('common.error'), t('customerService.unableToMaps'));
    });
  };

  const loadTickets = async () => {
    if (!user || !user.id) return;

    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading tickets:', error);
        throw error;
      }

      setTickets(data || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [user]);

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketDetail(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return '#FF9800';
      case 'in_progress':
        return '#2196F3';
      case 'resolved':
        return '#4CAF50';
      case 'closed':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return t('customerService.status.open');
      case 'in_progress':
        return t('customerService.status.inProgress');
      case 'resolved':
        return t('customerService.status.resolved');
      case 'closed':
        return t('customerService.status.closed');
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert(t('common.error'), t('customerService.fillBothFields'));
      return;
    }

    if (!user || !user.id) {
      Alert.alert(t('common.error'), t('customerService.mustBeLoggedIn'));
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert([
          {
            user_id: user.id,
            subject: subject.trim(),
            message: message.trim(),
            status: 'open',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error submitting support ticket:', error);
        throw error;
      }

      Alert.alert(
        t('common.success'),
        t('customerService.ticketSubmittedMessage'),
        [
          {
            text: t('common.close'),
            onPress: () => {
              setSubject('');
              setMessage('');
              navigation.goBack();
            },
          },
        ]
      );
      // Reload tickets after submission
      await loadTickets();
    } catch (error) {
      console.error('Failed to submit support ticket:', error);
      Alert.alert(t('common.error'), error.message || t('customerService.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqItems = [
    {
      question: t('faq.questions.general.updateProfile.question'),
      answer: t('faq.questions.general.updateProfile.answer'),
    },
    {
      question: t('faq.questions.general.viewMatch.question'),
      answer: t('faq.questions.general.viewMatch.answer'),
    },
    {
      question: t('faq.questions.medical.submitCheckin.question'),
      answer: t('faq.questions.medical.submitCheckin.answer'),
    },
    {
      question: t('faq.questions.documents.uploadDocuments.question'),
      answer: t('faq.questions.documents.uploadDocuments.answer'),
    },
    {
      question: t('faq.questions.matching.contactPartner.question'),
      answer: t('faq.questions.matching.contactPartner.answer'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('customerService.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loadingTickets} onRefresh={loadTickets} />
        }
      >
        {/* My Tickets Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('customerService.myTickets')}</Text>
          {loadingTickets && tickets.length === 0 ? (
            <Text style={styles.emptyText}>{t('customerService.loadingTickets')}</Text>
          ) : tickets.length === 0 ? (
            <Text style={styles.emptyText}>{t('customerService.noTickets')}</Text>
          ) : (
            tickets.map((ticket) => (
              <TouchableOpacity
                key={ticket.id}
                style={styles.ticketItem}
                onPress={() => handleViewTicket(ticket)}
              >
                <View style={styles.ticketContent}>
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketSubject} numberOfLines={1}>
                      {ticket.subject}
                    </Text>
                  </View>
                  <Text style={styles.ticketDate}>{formatDate(ticket.created_at)}</Text>
                  {ticket.admin_response && (
                    <View style={styles.hasResponseBadge}>
                      <Icon name="check-circle" size={14} color="#4CAF50" />
                      <Text style={styles.hasResponseText}>{t('customerService.adminResponse')}</Text>
                    </View>
                  )}
                  <View style={styles.ticketFooter}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(ticket.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>{getStatusLabel(ticket.status)}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.ticketArrowContainer}>
                  <Icon name="chevron-right" size={20} color="#CCC" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Contact Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('customerService.contactUs')}</Text>
          
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleCall('+1-888-245-1866')}
          >
            <View style={styles.contactIconContainer}>
              <Icon name="phone" size={24} color="#2A7BF6" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{t('customerService.phone')}</Text>
              <Text style={styles.contactValue}>+1-888-245-1866</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleEmail('info@usababytree.com')}
          >
            <View style={styles.contactIconContainer}>
              <Icon name="mail" size={24} color="#2A7BF6" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{t('customerService.email')}</Text>
              <Text style={styles.contactValue}>info@usababytree.com</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactItem}
            onPress={handleAddress}
          >
            <View style={styles.contactIconContainer}>
              <Icon name="map-pin" size={24} color="#2A7BF6" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{t('customerService.address')}</Text>
              <Text style={styles.contactValue}>961 W Holt Blvd, Ontario, CA 91762</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#CCC" />
          </TouchableOpacity>

          <View style={styles.contactItem}>
            <View style={styles.contactIconContainer}>
              <Icon name="clock" size={24} color="#2A7BF6" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{t('customerService.businessHours')}</Text>
              <Text style={styles.contactValue}>{t('customerService.businessHoursWeekday')}</Text>
              <Text style={styles.contactValue}>{t('customerService.businessHoursSaturday')}</Text>
              <Text style={styles.contactValue}>{t('customerService.businessHoursSunday')}</Text>
            </View>
          </View>
        </View>

        {/* Submit Ticket Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('customerService.submitTicket')}</Text>
          <Text style={styles.sectionDescription}>
            {t('customerService.formDescription')}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('customerService.subject')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('customerService.enterSubject')}
              value={subject}
              onChangeText={setSubject}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('customerService.message')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('customerService.enterMessage')}
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
              {isSubmitting ? t('customerService.submitting') : t('customerService.submit')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('faq.title')}</Text>
          
          {faqItems.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Ticket Detail Modal */}
      {showTicketDetail && selectedTicket && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('customerService.ticketDetails')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowTicketDetail(false);
                  setSelectedTicket(null);
                }}
                style={styles.closeButton}
              >
                <Icon name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('customerService.subject')}</Text>
                <Text style={styles.detailValue}>{selectedTicket.subject}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('customerService.status.label')}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(selectedTicket.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{getStatusLabel(selectedTicket.status)}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('customerService.submitted')}</Text>
                <Text style={styles.detailValue}>{formatDate(selectedTicket.created_at)}</Text>
              </View>

              {selectedTicket.updated_at !== selectedTicket.created_at && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('customerService.lastUpdated')}</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedTicket.updated_at)}</Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('customerService.yourMessage')}</Text>
                <Text style={styles.detailMessage}>{selectedTicket.message}</Text>
              </View>

              {selectedTicket.admin_response && (
                <View style={[styles.detailSection, styles.adminResponseSection]}>
                  <View style={styles.adminResponseHeader}>
                    <Icon name="message-circle" size={20} color="#4CAF50" />
                    <Text style={styles.adminResponseLabel}>{t('customerService.adminResponse')}</Text>
                  </View>
                  <Text style={styles.adminResponseText}>{selectedTicket.admin_response}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
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
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  ticketItem: {
    backgroundColor: '#F8F9FB',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  ticketContent: {
    flex: 1,
    padding: 16,
  },
  ticketHeader: {
    marginBottom: 8,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ticketDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  hasResponseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  hasResponseText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  ticketFooter: {
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ticketArrowContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 500,
  },
  detailSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  detailMessage: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  adminResponseSection: {
    backgroundColor: '#F0F9F4',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  adminResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminResponseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  adminResponseText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});

            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('customerService.message')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('customerService.enterMessage')}
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
              {isSubmitting ? t('customerService.submitting') : t('customerService.submit')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('faq.title')}</Text>
          
          {faqItems.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Ticket Detail Modal */}
      {showTicketDetail && selectedTicket && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('customerService.ticketDetails')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowTicketDetail(false);
                  setSelectedTicket(null);
                }}
                style={styles.closeButton}
              >
                <Icon name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('customerService.subject')}</Text>
                <Text style={styles.detailValue}>{selectedTicket.subject}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('customerService.status.label')}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(selectedTicket.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{getStatusLabel(selectedTicket.status)}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('customerService.submitted')}</Text>
                <Text style={styles.detailValue}>{formatDate(selectedTicket.created_at)}</Text>
              </View>

              {selectedTicket.updated_at !== selectedTicket.created_at && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('customerService.lastUpdated')}</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedTicket.updated_at)}</Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('customerService.yourMessage')}</Text>
                <Text style={styles.detailMessage}>{selectedTicket.message}</Text>
              </View>

              {selectedTicket.admin_response && (
                <View style={[styles.detailSection, styles.adminResponseSection]}>
                  <View style={styles.adminResponseHeader}>
                    <Icon name="message-circle" size={20} color="#4CAF50" />
                    <Text style={styles.adminResponseLabel}>{t('customerService.adminResponse')}</Text>
                  </View>
                  <Text style={styles.adminResponseText}>{selectedTicket.admin_response}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
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
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  ticketItem: {
    backgroundColor: '#F8F9FB',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  ticketContent: {
    flex: 1,
    padding: 16,
  },
  ticketHeader: {
    marginBottom: 8,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ticketDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  hasResponseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  hasResponseText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  ticketFooter: {
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ticketArrowContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 500,
  },
  detailSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  detailMessage: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  adminResponseSection: {
    backgroundColor: '#F0F9F4',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  adminResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminResponseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  adminResponseText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});
