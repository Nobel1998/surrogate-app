import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, Alert, Modal, TextInput, SafeAreaView, Platform, StatusBar, Share, RefreshControl, ActivityIndicator, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { VideoView, useVideoPlayer } from 'expo-video';

// 视频播放器组件
const VideoPlayer = ({ source, style }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(source, player => {
    player.loop = false;
    // 不自动播放，等待用户点击
  });

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <TouchableOpacity onPress={togglePlayback} style={style}>
      <VideoView
        style={style}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
      {!isPlaying && (
        <View style={styles.playButtonOverlay}>
          <View style={styles.playButton}>
            <Text style={styles.playButtonText}>▶️</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

export default function HomeScreen() {
  const { posts, likedPosts, likedComments, addPost, deletePost, handleLike, handleCommentLike, addComment, deleteComment, getComments, setCurrentUser, currentUserId, isLoading, isSyncing, refreshData, forceCompleteLoading, hasInitiallyLoaded } = useAppContext();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [postText, setPostText] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPostForComment, setSelectedPostForComment] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [replyToComment, setReplyToComment] = useState(null); // Store comment being replied to
  const [refreshing, setRefreshing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  // 设置当前用户ID当用户登录时
  useEffect(() => {
    if (user?.id && currentUserId !== user.id) {
      console.log('Setting current user in AppContext:', user.id);
      setCurrentUser(user.id);
    }
  }, [user, currentUserId, setCurrentUser]);

  // 当用户登录时，如果还在加载状态，强制完成加载
  useEffect(() => {
    if (user?.id && isLoading) {
      console.log('User is logged in but app is still loading, forcing completion');
      // 给一个短暂的延迟，让数据加载有机会完成
      const timer = setTimeout(() => {
        forceCompleteLoading();
      }, 2000); // 2秒后强制完成加载
      
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, forceCompleteLoading]);

  // 下拉刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  // Helper function to recursively count all comments and replies
  const countAllComments = (comments) => {
    let count = 0;
    comments.forEach(comment => {
      count += 1; // Count this comment
      if (comment.replies && comment.replies.length > 0) {
        count += countAllComments(comment.replies); // Recursively count replies
      }
    });
    return count;
  };

  // Update current user in AppContext when user changes
  React.useEffect(() => {
    if (user?.id) {
      setCurrentUser(user.id);
    }
  }, [user?.id]);

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
    // 直接打开发帖窗口
    setShowModal(true);
  };

  const publishPost = async () => {
    // 验证：至少要有文字或图片/视频
    if (!postText.trim() && !selectedImage) {
      Alert.alert('Error', 'Please add some text or media to your post.');
      return;
    }

    let mediaUri = null;
    let mediaType = null;

    if (selectedImage) {
      // 检测是否为视频文件
      const isVideo = selectedImage.type === 'video' || 
                     selectedImage.uri.includes('.mp4') || 
                     selectedImage.uri.includes('.mov') ||
                     selectedImage.uri.includes('.avi');
      
      mediaUri = selectedImage.uri;
      mediaType = isVideo ? 'video' : 'image';
    }

    const newPost = {
      content: postText.trim(),
      mediaUri: mediaUri,
      mediaType: mediaType,
      userName: user?.name || 'Surrogate Member',
      userId: user?.id || 'guest',
    };

    try {
      setIsPublishing(true);
      setUploadProgress(0);
      setUploadStatus(mediaUri ? 'Preparing upload...' : 'Publishing...');
      
      // 传递上传进度回调
      await addPost(newPost, (progress, status) => {
        setUploadProgress(progress);
        setUploadStatus(status);
      });
      
      setShowModal(false);
      setSelectedImage(null);
      setPostText('');
      setUploadProgress(0);
      setUploadStatus('');
      Alert.alert('Success', 'Your post has been published!');
    } catch (error) {
      console.error('Publish error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to publish post.\n\n';
      if (error.message) {
        errorMessage += `Error: ${error.message}\n`;
      }
      if (error.code) {
        errorMessage += `Code: ${error.code}\n`;
      }
      if (error.details) {
        errorMessage += `Details: ${error.details}\n`;
      }
      if (error.hint) {
        errorMessage += `Hint: ${error.hint}`;
      }
      
      Alert.alert('Publish Error', errorMessage);
    } finally {
      setIsPublishing(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const handleComment = (postId) => {
    setSelectedPostForComment(postId);
    setReplyToComment(null);
    setShowCommentModal(true);
  };

  const handleReply = (postId, comment) => {
    setSelectedPostForComment(postId);
    setReplyToComment(comment);
    setShowCommentModal(true);
  };

  const submitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    try {
      await addComment(
        selectedPostForComment, 
        commentText, 
        user?.name || 'Anonymous',
        user?.id || 'guest',
        replyToComment?.id || null
      );
      setCommentText('');
      setReplyToComment(null);
      setShowCommentModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to post comment. Please try again.');
      console.error('Comment error:', error);
    }
  };

  // Recursive function to render comments and nested replies
  const renderCommentItem = (comment, depth = 0) => {
    const isOwnComment = comment.userId === user?.id;
    const isLikedComment = likedComments?.has(comment.id);
    const indentStyle = depth > 0 ? { marginLeft: Math.min(depth * 24, 72) } : {};
    
    return (
      <View key={comment.id}>
        <View style={[styles.commentItem, indentStyle]}>
          <View style={styles.commentHeader}>
            <Avatar name={comment.userName} size={32} />
            <View style={[styles.commentInfo, { marginLeft: 10 }]}>
              <Text style={styles.commentUserNameBold}>{comment.userName}</Text>
              <Text style={styles.commentTimestamp}>{comment.timestamp}</Text>
            </View>
            {isOwnComment && (
              <TouchableOpacity 
                onPress={() => handleDeleteComment(selectedPostForComment, comment.id)}
                style={styles.commentDeleteButton}
              >
                <Text style={styles.deleteIconSmall}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.commentTextFull}>{comment.text}</Text>
          <View style={styles.commentActions}>
            <TouchableOpacity 
              style={styles.commentLikeButton}
              onPress={() => handleCommentLike(selectedPostForComment, comment.id)}
            >
              <Text style={styles.commentLikeIcon}>{isLikedComment ? '❤️' : '🤍'}</Text>
              <Text style={[styles.commentLikeText, isLikedComment && styles.commentLikedText]}>
                {comment.likes > 0 ? comment.likes : ''} {comment.likes === 1 ? 'Like' : 'Likes'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.replyButton}
              onPress={() => handleReply(selectedPostForComment, comment)}
            >
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Recursively render all nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View>
            {comment.replies.map((reply) => renderCommentItem(reply, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  const handleDeletePost = (postId) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePost(postId, user?.id);
            Alert.alert('Success', 'Post deleted successfully');
          }
        }
      ]
    );
  };

  const handleDeleteComment = (postId, commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteComment(postId, commentId, user?.id);
          }
        }
      ]
    );
  };

  const handleShare = async (postId) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      
      // 兼容新旧数据结构
      const postContent = post.content || post.text;
      const postMedia = post.mediaUri || post.image;
      const postMediaType = post.mediaType || post.type;
      
      let shareMessage = '📱 Check out this post from Surrogate Community!\n\n';
      
      if (postContent) {
        shareMessage += `${postContent}\n\n`;
      }
      
      shareMessage += `Shared from BabyTree Surrogacy Community`;

      const shareOptions = [];

      shareOptions.push({
        text: '📋 Copy Text Only',
        onPress: async () => {
          await Clipboard.setStringAsync(shareMessage);
          Alert.alert('Copied!', 'Text content copied to clipboard. You can now paste it in any messaging app.');
        },
      });

      shareOptions.push({
        text: '📤 Share via Other Apps',
        onPress: async () => {
          try {
            await Share.share({
              message: shareMessage,
              title: 'Share Community Post',
            });
          } catch (error) {
            console.error('Share error:', error);
            await Clipboard.setStringAsync(shareMessage);
            Alert.alert('Copied!', 'Share failed. Content copied to clipboard instead.');
          }
        },
      });

      shareOptions.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert(
        'Share Post',
        postMedia 
          ? 'Note: Media files are stored in the cloud. You can copy the text or share via other apps:'
          : 'Choose how to share:',
        shareOptions
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to share post');
      console.error('Share error:', error);
    }
  };

  // Events功能已移到EventScreen中



  const renderPost = (post) => {
    const postComments = getComments(post.id);
    const totalCommentCount = countAllComments(postComments);
    const isOwnPost = post.userId === user?.id;
    
    // 兼容新旧数据结构
    const postContent = post.content || post.text;
    const postMedia = post.mediaUri || post.image;
    const postMediaType = post.mediaType || post.type;
    
    return (
    <View key={post.id} style={styles.postCard}>
      <View style={styles.postHeader}>
          <Avatar name={post.userName || 'Surrogate Member'} size={44} style={styles.userAvatar} />
        <View style={styles.postInfo}>
            <Text style={styles.userName}>{post.userName || 'Surrogate Member'}</Text>
          <Text style={styles.timestamp}>{post.timestamp}</Text>
        </View>
          {isOwnPost && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDeletePost(post.id)}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          )}
      </View>
      
        {postContent ? <Text style={styles.postText}>{postContent}</Text> : null}
      
        {postMedia && postMediaType === 'video' ? (
        <VideoPlayer
          source={{ uri: postMedia }}
          style={styles.postVideo}
        />
        ) : postMedia ? (
          <Image source={{ uri: postMedia }} style={styles.postImage} />
      ) : null}
        
        {/* Comments preview */}
        {totalCommentCount > 0 && (
          <View style={styles.commentsPreview}>
            <Text style={styles.commentsCount}>{totalCommentCount} comment{totalCommentCount > 1 ? 's' : ''}</Text>
            <View style={styles.latestComment}>
              <Text style={styles.commentUserName}>{postComments[postComments.length - 1].userName}:</Text>
              <Text style={styles.commentText} numberOfLines={1}> {postComments[postComments.length - 1].text}</Text>
            </View>
          </View>
        )}
      
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
              {post.likes > 0 ? post.likes : ''} {post.likes > 1 ? 'Likes' : 'Like'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleComment(post.id)}
        >
          <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>
              {totalCommentCount > 0 ? totalCommentCount + ' ' : ''}{totalCommentCount > 1 ? 'Comments' : 'Comment'}
            </Text>
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
  };

  // Community 只显示帖子，不包含 events
  const feedData = useMemo(() => {
    return posts.map(post => ({ ...post, type: 'post' }));
  }, [posts]);

  const renderItem = useCallback(({ item }) => {
    return renderPost(item);
  }, [likedPosts, user, getComments]);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerContainer}>
        <Text style={styles.title}>👥 Surrogate Community</Text>
        <Text style={styles.subtitle}>Share and connect with other surrogates</Text>
      </View>
      
              {isLoading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color="#2A7BF6" />
                  <Text style={styles.loadingText}>Loading posts...</Text>
                </View>
              ) : feedData.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="users" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>No posts yet in the community</Text>
                    <Text style={styles.emptySubtext}>Be the first to share your surrogacy journey with other surrogates!</Text>
                  </View>
                ) : (
                <FlatList
                  data={feedData}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                  style={styles.feed}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      colors={['#2A7BF6']}
                      tintColor="#2A7BF6"
                    />
                  }
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={5}
                  updateCellsBatchingPeriod={100}
                  windowSize={10}
                />
              )}
      
      <TouchableOpacity style={styles.fab} onPress={showImagePicker}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Post Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowModal(false); }} disabled={isPublishing}>
              <Text style={[styles.cancelButton, isPublishing && styles.disabledText]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share with Community</Text>
            <TouchableOpacity onPress={publishPost} disabled={isPublishing}>
              {isPublishing ? (
                <ActivityIndicator size="small" color="#2A7BF6" />
              ) : (
              <Text style={styles.publishButton}>Share</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Upload Progress Bar */}
          {isPublishing && uploadProgress > 0 && (
            <View style={styles.uploadProgressContainer}>
              <View style={styles.uploadProgressBar}>
                <View style={[styles.uploadProgressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.uploadProgressText}>{uploadStatus}</Text>
            </View>
          )}
          
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.communityNotice}>
                <Text style={styles.communityNoticeIcon}>ℹ️</Text>
                <Text style={styles.communityNoticeText}>
                  Your post will be visible to all surrogates in the community
                </Text>
              </View>
              
              <View style={styles.userInfo}>
                <Avatar name={user?.name || 'Surrogate Member'} size={40} />
                <Text style={[styles.userName, { marginLeft: 12 }]}>{user?.name || 'Surrogate Member'}</Text>
              </View>
              
              <TextInput
                style={styles.textInput}
                placeholder="Share your journey, experiences, or thoughts with other surrogates..."
                placeholderTextColor="#6E7191"
                value={postText}
                onChangeText={setPostText}
                multiline
                numberOfLines={4}
                autoFocus={!selectedImage}
              />
              
              {selectedImage ? (
                <View style={styles.mediaPreviewContainer}>
                  {/* Remove button at top for easy access */}
                  <TouchableOpacity 
                    style={styles.removeMediaButtonTop}
                    onPress={() => { Keyboard.dismiss(); setSelectedImage(null); }}
                  >
                    <Text style={styles.removeMediaText}>🗑️ Remove Media</Text>
                  </TouchableOpacity>
                  
                  {selectedImage.type === 'video' || 
                   selectedImage.uri.includes('.mp4') || 
                   selectedImage.uri.includes('.mov') ||
                   selectedImage.uri.includes('.avi') ? (
                    <VideoPlayer
                      source={{ uri: selectedImage.uri }}
                      style={styles.previewVideo}
                    />
                  ) : (
                    <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                  )}
                </View>
              ) : (
                <View style={styles.mediaOptionsContainer}>
                  <Text style={styles.mediaOptionsTitle}>Add Media (Optional)</Text>
                  <View style={styles.mediaButtonsRow}>
                    <TouchableOpacity 
                      style={styles.mediaOptionButton}
                      onPress={() => { Keyboard.dismiss(); takePhoto(); }}
                    >
                      <Text style={styles.mediaEmojiIcon}>📷</Text>
                      <Text style={styles.mediaOptionText}>Camera</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.mediaOptionButton}
                      onPress={() => { Keyboard.dismiss(); recordVideo(); }}
                    >
                      <Text style={styles.mediaEmojiIcon}>🎥</Text>
                      <Text style={styles.mediaOptionText}>Video</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.mediaOptionButton}
                      onPress={() => { Keyboard.dismiss(); pickImage(); }}
                    >
                      <Text style={styles.mediaEmojiIcon}>🖼️</Text>
                      <Text style={styles.mediaOptionText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.commentModalFull}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowCommentModal(false);
              setCommentText('');
              setReplyToComment(null);
            }}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {replyToComment ? 'Reply to Comment' : 'Add Comment'}
            </Text>
            <TouchableOpacity onPress={submitComment}>
              <Text style={styles.publishButton}>Post</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.commentScrollView} keyboardShouldPersistTaps="handled">
            <View style={styles.commentInputContainer}>
              <View style={styles.userInfo}>
                <Avatar name={user?.name || 'Anonymous'} size={40} />
                <Text style={[styles.userName, { marginLeft: 12 }]}>{user?.name || 'Anonymous'}</Text>
              </View>
              
              {replyToComment && (
                <View style={styles.replyingToContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar name={replyToComment.userName} size={24} style={{ marginRight: 8 }} />
                    <Text style={styles.replyingToText}>
                      Replying to <Text style={styles.replyingToName}>{replyToComment.userName}</Text>
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setReplyToComment(null)} style={{ padding: 4 }}>
                    <Text style={{ fontSize: 16, color: '#666', fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <TextInput
                style={styles.commentInput}
                placeholder={replyToComment ? "Write a reply..." : "Write a comment..."}
                placeholderTextColor="#999"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                autoFocus={true}
                textAlignVertical="top"
              />
            </View>
            
            {/* Show existing comments */}
            {selectedPostForComment && getComments(selectedPostForComment).length > 0 && (
              <View style={styles.existingCommentsSection}>
                <Text style={styles.commentsListTitle}>
                  Comments ({countAllComments(getComments(selectedPostForComment))})
                </Text>
                {getComments(selectedPostForComment).map((comment) => renderCommentItem(comment, 0))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F7FA', // 更高级的冷灰背景
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, // 极淡的阴影
    shadowRadius: 10,
    elevation: 0,
    zIndex: 10,
    marginBottom: 16,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800',
    color: '#1A1D1E',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: -0.5,
    textAlign: 'left', // 左对齐更现代
  },
  subtitle: {
    fontSize: 15,
    color: '#6E7191',
    fontWeight: '500',
    textAlign: 'left', // 左对齐
    marginBottom: 8,
  },
  feed: { 
    flex: 1,
    paddingHorizontal: 20, // 增加左右间距
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#6E7191',
    marginTop: 16,
    fontWeight: '500',
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
  disabledText: {
    opacity: 0.5,
  },
  uploadProgressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F0F7FF',
  },
  uploadProgressBar: {
    height: 6,
    backgroundColor: '#E0E7EE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#2A7BF6',
    borderRadius: 3,
  },
  uploadProgressText: {
    fontSize: 13,
    color: '#2A7BF6',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 20, // 更大的圆角
    marginBottom: 20,
    padding: 20,
    shadowColor: '#1A1D1E', // 使用深色阴影源
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04, // 非常柔和
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 0,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  companyAvatar: {
    backgroundColor: '#E3F2FD',
  },
  postInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: '#A0A3BD',
    fontWeight: '500',
  },
  postText: {
    fontSize: 16,
    color: '#2E3A59',
    lineHeight: 26, // 增加行高
    marginBottom: 16,
    fontWeight: '400',
  },
  postImage: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#F5F7FA',
  },
  postVideo: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#000',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F7FA',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  likedIcon: {
    transform: [{ scale: 1.1 }],
  },
  actionText: {
    fontSize: 14,
    color: '#6E7191',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 34,
    backgroundColor: '#2A7BF6',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#2A7BF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
    backgroundColor: '#fff',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6E7191',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  publishButton: {
    fontSize: 16,
    color: '#2A7BF6',
    fontWeight: '700',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  mediaPreviewContainer: {
    marginTop: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  communityNotice: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 0,
  },
  communityNoticeIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  communityNoticeText: {
    fontSize: 14,
    color: '#2A7BF6',
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  textInput: {
    fontSize: 16,
    color: '#1A1D1E', // 更黑的文字颜色
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  previewVideo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  mediaOptionsContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
  },
  mediaOptionsTitle: {
    fontSize: 14,
    color: '#6E7191',
    fontWeight: '600',
    marginBottom: 12,
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mediaOptionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mediaEmojiIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  mediaOptionText: {
    fontSize: 12,
    color: '#2A7BF6',
    fontWeight: '600',
    marginTop: 4,
  },
  removeMediaButton: {
    alignItems: 'center',
    padding: 8,
    marginTop: 8,
  },
  removeMediaButtonTop: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  removeMediaText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#28a745', // 绿色调阴影
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderLeftWidth: 0, // 移除左侧硬边
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eventInfo: {
    flex: 1,
    marginLeft: 14,
  },
  eventCategory: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 8,
    lineHeight: 28,
  },
  eventDescription: {
    fontSize: 16,
    color: '#4E5D78',
    lineHeight: 24,
    marginBottom: 16,
  },
  eventDetail: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  eventDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0A3BD',
    width: 24, // Icon width
  },
  eventDetailText: {
    fontSize: 14,
    color: '#1A1D1E',
    flex: 1,
    fontWeight: '500',
  },
  eventImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F7FA',
    marginTop: 8,
  },
  commentsPreview: {
    paddingTop: 12,
    paddingBottom: 4,
    marginTop: 8,
    backgroundColor: '#F5F7FA', // 评论预览用淡淡的背景
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  commentsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6E7191',
    marginBottom: 6,
  },
  latestComment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  commentText: {
    fontSize: 14,
    color: '#4E5D78',
    flex: 1,
  },
  commentModalFull: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  commentScrollView: {
    flex: 1,
  },
  commentInputContainer: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  commentInput: {
    fontSize: 16,
    color: '#1A1D1E',
    minHeight: 100,
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    borderWidth: 0, // 移除边框
  },
  existingCommentsSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 30, // 底部留白
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  commentsListTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 20,
  },
  commentItem: {
    marginBottom: 20,
    paddingBottom: 0, // 移除底边距
    borderBottomWidth: 0, // 移除底边框
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  smallUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commentInfo: {
    flex: 1,
  },
  commentUserNameBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  commentTimestamp: {
    fontSize: 11,
    color: '#A0A3BD',
    marginTop: 2,
  },
  commentTextFull: {
    fontSize: 15,
    color: '#2E3A59',
    lineHeight: 22,
    marginLeft: 42, // 对齐头像右侧
  },
  deleteButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  deleteIcon: {
    fontSize: 18,
  },
  commentDeleteButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  deleteIconSmall: {
    fontSize: 14,
  },
  deleteIconSmaller: {
    fontSize: 12,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 42,
    marginTop: 10,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  commentLikeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  commentLikeText: {
    fontSize: 13,
    color: '#A0A3BD',
    fontWeight: '500',
  },
  commentLikedText: {
    color: '#FF6B6B',
  },
  replyButton: {
    // removed marginLeft as it's now in commentActions
  },
  replyButtonText: {
    fontSize: 13,
    color: '#2A7BF6',
    fontWeight: '600',
  },
  repliesContainer: {
    marginLeft: 42,
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#EEF2F6',
  },
  replyItem: {
    marginBottom: 16,
  },
  replyTextFull: {
    fontSize: 14,
    color: '#2E3A59',
    lineHeight: 20,
    marginLeft: 32, // Indented for reply
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 13,
    color: '#666',
  },
  replyingToName: {
    fontWeight: '600',
    color: '#2A7BF6',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  playButtonText: {
    fontSize: 24,
    marginLeft: 4, // 微调播放图标位置
  },
}); 