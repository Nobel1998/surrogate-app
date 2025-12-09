import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, StatusBar, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';

export default function EventScreen() {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const { 
    events, 
    likedEvents, 
    handleEventLike, 
    registerForEvent, 
    refreshData,
    isLoading 
  } = useAppContext();
  
  const [refreshing, setRefreshing] = React.useState(false);

  // 下拉刷新
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing events:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  // 处理事件报名
  const handleRegister = async (event) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please log in to register for events.',
        [{ text: 'OK', onPress: () => navigation.navigate('LoginScreen') }]
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
            const result = await registerForEvent(event.id);
            if (result.success) {
              Alert.alert('Success', 'You have been registered for this event!');
            } else {
              Alert.alert('Error', result.error || 'Failed to register for event');
            }
          }
        }
      ]
    );
  };

  // 处理点赞
  const handleLike = async (eventId) => {
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

  const renderEventItem = ({ item }) => {
    const isLiked = likedEvents?.has(item.id) || false;
    const isUpcoming = new Date(item.eventDate) > new Date();
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('EventDetailScreen', { eventId: item.id })}
        activeOpacity={0.7}
      >
        {item.image && (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{item.category}</Text>
            </View>
            {item.isFeatured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>⭐ Featured</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDate}>{item.date} • {item.location}</Text>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>

          {/* 事件统计和快速操作 */}
          <View style={styles.cardFooter}>
            <View style={styles.statsContainer}>
              <TouchableOpacity 
                style={styles.likeButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleLike(item.id);
                }}
              >
                <Text style={[styles.likeIcon, isLiked && styles.likedIcon]}>
                  {isLiked ? '❤️' : '🤍'}
                </Text>
                <Text style={styles.statText}>{item.likesCount || 0}</Text>
              </TouchableOpacity>
              
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>👥</Text>
                <Text style={styles.statText}>
                  {item.registrationCount || 0}
                  {item.maxParticipants ? `/${item.maxParticipants}` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              {isAuthenticated && isUpcoming && (
                <TouchableOpacity 
                  style={styles.quickRegisterButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleRegister(item);
                  }}
                >
                  <Text style={styles.quickRegisterText}>Register</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.viewDetailButton}
                onPress={() => navigation.navigate('EventDetailScreen', { eventId: item.id })}
              >
                <Text style={styles.viewDetailText}>View Details →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleLoginPress = () => {
    // If inside GuestTab, we might need to navigate to a specific route
    // But standard 'Login' route should work if defined in the navigator
    navigation.navigate('LoginScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Blogs</Text>
        <Text style={styles.subtitle}>News, Policies & Updates</Text>
      </View>
      
      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2A7BF6']}
            tintColor="#2A7BF6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Blogs Available</Text>
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading blogs...' : 'Check back later for new updates!'}
            </Text>
          </View>
        }
        />
        
      {!isAuthenticated && (
        <View style={styles.authPromptContainer}>
          <Text style={styles.authPromptText}>
            Join our community to access full features
          </Text>
            <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLoginPress}
            >
            <Text style={styles.loginButtonText}>Log In / Register</Text>
            </TouchableOpacity>
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
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { 
    fontSize: 28,
    fontWeight: 'bold', 
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100, // Add padding for the bottom auth prompt
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeContainer: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#2A7BF6',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: {
    color: '#856404',
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  cardDate: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeIcon: {
    fontSize: 16,
  },
  likedIcon: {
    fontSize: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 14,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  quickRegisterButton: {
    backgroundColor: '#2A7BF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickRegisterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewDetailButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewDetailText: {
    color: '#2A7BF6',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  authPromptContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'column',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  authPromptText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  loginButton: {
    backgroundColor: '#2A7BF6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

