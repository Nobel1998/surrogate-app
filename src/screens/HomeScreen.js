import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Modal, TextInput, SafeAreaView, Platform, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Video } from 'expo-av';
import { useAppContext } from '../context/AppContext';

export default function HomeScreen() {
  const { posts, events, likedPosts, likedEvents, addPost, handleLike, handleEventLike } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [postText, setPostText] = useState('');

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Permission Required', 'We need camera and photo library permissions to share photos and videos.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setShowModal(true);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setShowModal(true);
    }
  };

  const recordVideo = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setShowModal(true);
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Add Content',
      'Choose how you want to add content',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Record Video', onPress: recordVideo },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const publishPost = () => {
    if (!selectedImage) return;

    // 检测是否为视频文件
    const isVideo = selectedImage.type === 'video' || 
                   selectedImage.uri.includes('.mp4') || 
                   selectedImage.uri.includes('.mov') ||
                   selectedImage.uri.includes('.avi');

    const newPost = {
      id: Date.now().toString(),
      text: postText,
      image: selectedImage.uri,
      timestamp: new Date().toLocaleString(),
      type: isVideo ? 'video' : 'image',
      likes: 0,
      comments: 0,
    };

    addPost(newPost);
    setShowModal(false);
    setSelectedImage(null);
    setPostText('');
  };

  const handleComment = (postId) => {
    Alert.alert('Comment', 'Comment feature will be implemented soon!');
  };

  const handleShare = (postId) => {
    Alert.alert('Share', 'Share feature will be implemented soon!');
  };

  const handleEventComment = (eventId) => {
    Alert.alert('Comment', 'Comment feature will be implemented soon!');
  };

  const handleEventShare = (eventId) => {
    Alert.alert('Share', 'Share feature will be implemented soon!');
  };

  const renderEvent = (event) => (
    <View key={event.id} style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <View style={[
          styles.userAvatar,
          event.publisher === 'company' && styles.companyAvatar
        ]}>
          <Icon 
            name={event.publisher === 'company' ? 'briefcase' : 'user'} 
            size={20} 
            color={event.publisher === 'company' ? '#fff' : '#666'} 
          />
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.userName}>
            {event.publisher === 'company' ? 'BabyTree Surrogacy' : 'Surrogate Mom'}
          </Text>
          <Text style={styles.timestamp}>{event.timestamp}</Text>
        </View>
        <View style={styles.eventCategory}>
          <Text style={styles.categoryText}>
            {event.category === 'transplant' ? '🌱 Transplant' :
             event.category === 'medical' ? '🏥 Medical' :
             event.category === 'gathering' ? '🎉 Gathering' :
             event.category === 'celebration' ? '🎊 Celebration' :
             '📅 Event'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventDescription}>{event.description}</Text>
      
      {event.date && (
        <View style={styles.eventDetail}>
          <Text style={styles.eventDetailLabel}>📅 Date:</Text>
          <Text style={styles.eventDetailText}>{event.date}</Text>
        </View>
      )}
      
      {event.location && (
        <View style={styles.eventDetail}>
          <Text style={styles.eventDetailLabel}>📍 Location:</Text>
          <Text style={styles.eventDetailText}>{event.location}</Text>
        </View>
      )}
      
      {event.image && (
        <Image source={{ uri: event.image.uri || event.image }} style={styles.eventImage} />
      )}
      
      <View style={styles.eventActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleEventLike(event.id)}
        >
          <Text style={[
            styles.actionIcon, 
            likedEvents.has(event.id) && styles.likedIcon
          ]}>
            {likedEvents.has(event.id) ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionText}>
            {event.likes > 0 ? event.likes : ''} Like
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEventComment(event.id)}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEventShare(event.id)}
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPost = (post) => (
    <View key={post.id} style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userAvatar}>
          <Icon name="user" size={20} color="#666" />
        </View>
        <View style={styles.postInfo}>
          <Text style={styles.userName}>Surrogate Member</Text>
          <Text style={styles.timestamp}>{post.timestamp}</Text>
        </View>
      </View>
      
      {post.text ? <Text style={styles.postText}>{post.text}</Text> : null}
      
      {post.image && post.type === 'video' ? (
        <Video
          source={{ uri: post.image }}
          style={styles.postVideo}
          useNativeControls
          resizeMode="contain"
          isLooping={false}
        />
      ) : post.image ? (
        <Image source={{ uri: post.image }} style={styles.postImage} />
      ) : null}
      
      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleLike(post.id)}
        >
          <Text style={[
            styles.actionIcon, 
            likedPosts.has(post.id) && styles.likedIcon
          ]}>
            {likedPosts.has(post.id) ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionText}>
            {post.likes > 0 ? post.likes : ''} Like
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleComment(post.id)}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleShare(post.id)}
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerContainer}>
        <Text style={styles.title}>👥 Surrogate Community</Text>
        <Text style={styles.subtitle}>Share and connect with other surrogates</Text>
      </View>
      
              <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
                {posts.length === 0 && events.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="users" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>No posts yet in the community</Text>
                    <Text style={styles.emptySubtext}>Be the first to share your surrogacy journey with other surrogates!</Text>
                  </View>
                ) : (
                  <>
                    {events.map(renderEvent)}
                    {posts.map(renderPost)}
                  </>
                )}
              </ScrollView>
      
      <TouchableOpacity style={styles.fab} onPress={showImagePicker}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Post Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share with Community</Text>
            <TouchableOpacity onPress={publishPost}>
              <Text style={styles.publishButton}>Share</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.communityNotice}>
              <Text style={styles.communityNoticeIcon}>ℹ️</Text>
              <Text style={styles.communityNoticeText}>
                Your post will be visible to all surrogates in the community
              </Text>
            </View>
            
            <View style={styles.userInfo}>
              <View style={styles.userAvatar}>
                <Icon name="user" size={20} color="#666" />
              </View>
              <Text style={styles.userName}>Surrogate Member</Text>
            </View>
            
            <TextInput
              style={styles.textInput}
              placeholder="Share your journey, experiences, or thoughts with other surrogates..."
              value={postText}
              onChangeText={setPostText}
              multiline
              numberOfLines={4}
            />
            
            {selectedImage && (
              selectedImage.type === 'video' || 
              selectedImage.uri.includes('.mp4') || 
              selectedImage.uri.includes('.mov') ||
              selectedImage.uri.includes('.avi') ? (
                <Video
                  source={{ uri: selectedImage.uri }}
                  style={styles.previewVideo}
                  useNativeControls
                  resizeMode="contain"
                  isLooping={false}
                />
              ) : (
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              )
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FB' 
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 10,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 8,
    color: '#2A7BF6',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 20,
    marginBottom: 16,
    textAlign: 'center'
  },
  feed: { 
    flex: 1,
    paddingHorizontal: 16
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  companyAvatar: {
    backgroundColor: '#2A7BF6'
  },
  postInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  postText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12
  },
  postVideo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 6
  },
  likedIcon: {
    transform: [{ scale: 1.1 }]
  },
  actionText: {
    fontSize: 14,
    color: '#666'
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#2A7BF6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#2A7BF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  cancelButton: {
    fontSize: 16,
    color: '#666'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  publishButton: {
    fontSize: 16,
    color: '#2A7BF6',
    fontWeight: '600'
  },
  modalContent: {
    flex: 1,
    padding: 16
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  communityNotice: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#2A7BF6'
  },
  communityNoticeIcon: {
    fontSize: 20,
    marginRight: 8
  },
  communityNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8
  },
  previewVideo: {
    width: '100%',
    height: 200,
    borderRadius: 8
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745'
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12
  },
  eventCategory: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#28a745'
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  eventDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12
  },
  eventDetail: {
    flexDirection: 'row',
    marginBottom: 8
  },
  eventDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 8
  },
  eventDetailText: {
    fontSize: 14,
    color: '#333',
    flex: 1
  },
  eventImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
}); 