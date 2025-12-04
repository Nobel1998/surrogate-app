import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert, 
  Share,
  ActivityIndicator 
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function EventDetailScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { events, handleEventLike, registerForEvent, likedEvents, registeredEvents } = useAppContext();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    // 查找事件
    const foundEvent = events.find(e => e.id === eventId);
    setEvent(foundEvent);
    setLoading(false);
  }, [eventId, events]);
  
  // 监听点赞状态变化，确保正确显示
  useEffect(() => {
    console.log('EventDetailScreen: Liked events state updated', {
      eventId,
      isLiked: likedEvents?.has(eventId),
      likedEventsSize: likedEvents?.size || 0,
      isAuthenticated
    });
  }, [likedEvents, eventId, isAuthenticated]);
  
  // 监听注册状态变化
  useEffect(() => {
    if (event) {
      console.log('EventDetailScreen: Event and Registration state', {
        eventId,
        eventTitle: event.title,
        eventDate: event.eventDate,
        currentDate: new Date().toISOString(),
        isUpcoming: new Date(event.eventDate) > new Date(),
        isRegistered: registeredEvents?.has(eventId),
        registeredEventsSize: registeredEvents?.size || 0,
        isAuthenticated
      });
    }
  }, [registeredEvents, event, eventId, isAuthenticated]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please log in to like events.',
        [{ text: 'OK', onPress: () => navigation.navigate('LoginScreen') }]
      );
      return;
    }

    await handleEventLike(eventId);
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please log in to register for events.',
        [{ text: 'OK', onPress: () => navigation.navigate('LoginScreen') }]
      );
      return;
    }

    if (isRegistered) {
      Alert.alert(
        'Already Registered',
        'You are already registered for this event.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Register for Event',
      `Do you want to register for "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Register', 
          onPress: async () => {
            setRegistering(true);
            const result = await registerForEvent(eventId);
            setRegistering(false);
            
            if (result.success) {
              Alert.alert('Success', 'You have been registered for this event!');
              // 强制重新渲染以显示更新的注册状态
              setEvent(prev => prev ? { ...prev, registrationCount: (prev.registrationCount || 0) + 1 } : prev);
            } else {
              Alert.alert('Error', result.error || 'Failed to register for event');
            }
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    try {
      let shareMessage = `📅 ${event.title}\n\n`;
      
      if (event.description) {
        shareMessage += `${event.description}\n\n`;
      }
      
      if (event.date) {
        shareMessage += `📅 Date: ${event.date}\n`;
      }
      
      if (event.location) {
        shareMessage += `📍 Location: ${event.location}\n`;
      }
      
      shareMessage += '\n📱 Download BabyTree Surrogacy App to join our community!';

      const shareOptions = [
        {
          text: '📋 Copy Text',
          onPress: async () => {
            await Clipboard.setStringAsync(shareMessage);
            Alert.alert('Copied!', 'Event details copied to clipboard.');
          },
        },
        {
          text: '📤 Share via Apps',
          onPress: async () => {
            try {
              await Share.share({
                message: shareMessage,
                title: event.title,
              });
            } catch (error) {
              await Clipboard.setStringAsync(shareMessage);
              Alert.alert('Copied!', 'Share failed. Content copied to clipboard instead.');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ];

      Alert.alert('Share Event', 'Choose how to share:', shareOptions);
    } catch (error) {
      Alert.alert('Error', 'Failed to share event');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2A7BF6" />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Event Not Found</Text>
          <Text style={styles.errorText}>The event you're looking for doesn't exist or has been removed.</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isLiked = likedEvents?.has(eventId) || false;
  const isRegistered = registeredEvents?.has(eventId) || false;
  const isUpcoming = new Date(event.eventDate) > new Date();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backIcon}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIconText}>←</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.shareIcon}
            onPress={handleShare}
          >
            <Text style={styles.shareIconText}>📤</Text>
          </TouchableOpacity>
        </View>

        {/* Event Image */}
        {event.image && (
          <Image source={{ uri: event.image }} style={styles.eventImage} />
        )}

        {/* Event Content */}
        <View style={styles.content}>
          {/* Category and Featured Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{event.category || 'General'}</Text>
            </View>
            {event.isFeatured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>⭐ Featured</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{event.description}</Text>

          {/* Detailed Content */}
          {event.content && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Event Details</Text>
              <Text style={styles.detailContent}>{event.content}</Text>
            </View>
          )}

          {/* Event Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>📅</Text>
              <View>
                <Text style={styles.infoLabel}>Date & Time</Text>
                <Text style={styles.infoText}>{event.date}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>📍</Text>
              <View>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoText}>{event.location}</Text>
              </View>
            </View>

            {event.maxParticipants && (
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>👥</Text>
                <View>
                  <Text style={styles.infoLabel}>Capacity</Text>
                  <Text style={styles.infoText}>
                    {event.registrationCount || 0} / {event.maxParticipants} registered
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{event.likesCount || 0}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{event.registrationCount || 0}</Text>
              <Text style={styles.statLabel}>Registered</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.likeButton]}
          onPress={handleLike}
        >
          <Text style={styles.likeIcon}>{isLiked ? '❤️' : '🤍'}</Text>
          <Text style={[styles.actionButtonText, isLiked && styles.likedText]}>
            {isLiked ? 'Liked' : 'Like'}
          </Text>
        </TouchableOpacity>

        {isAuthenticated && (
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              !isUpcoming ? styles.expiredButton :
              isRegistered ? styles.registeredButton : styles.registerButton
            ]}
            onPress={isUpcoming ? handleRegister : null}
            disabled={registering || isRegistered || !isUpcoming}
          >
            {registering ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.registerIcon}>
                  {!isUpcoming ? '⏰' : isRegistered ? '✅' : '✓'}
                </Text>
                <Text style={[
                  styles.actionButtonText,
                  (isRegistered || !isUpcoming) && { color: '#fff' }
                ]}>
                  {!isUpcoming ? 'Event Passed' : isRegistered ? 'Registered' : 'Register'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#2A7BF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  shareIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shareIconText: {
    fontSize: 18,
  },
  eventImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: '#2A7BF6',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featuredText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    lineHeight: 32,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    fontSize: 14,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 34, // Safe area bottom
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  likeButton: {
    backgroundColor: '#F8F9FB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  registerButton: {
    backgroundColor: '#2A7BF6',
  },
  registeredButton: {
    backgroundColor: '#28A745',
    opacity: 0.8,
  },
  expiredButton: {
    backgroundColor: '#6C757D',
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  likeIcon: {
    fontSize: 18,
  },
  likedText: {
    color: '#E91E63',
  },
  registerIcon: {
    fontSize: 16,
    color: '#fff',
  },
});
