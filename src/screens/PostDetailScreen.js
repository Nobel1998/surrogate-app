import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, Alert, TextInput, Modal } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

// 视频播放器组件
const VideoPlayer = ({ source, style }) => {
  const player = useVideoPlayer(source, player => {
    player.loop = false;
    player.play();
  });

  return (
    <VideoView
      style={style}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
};
import Icon from 'react-native-vector-icons/Feather';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params || {};
  const { posts, likedPosts, likedComments, handleLike, handleCommentLike, deletePost, addComment, deleteComment, getComments, setCurrentUser, currentUserId } = useAppContext();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyToComment, setReplyToComment] = useState(null);

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
  useEffect(() => {
    if (user?.id) {
      setCurrentUser(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (postId) {
      const foundPost = posts.find(p => p.id === postId);
      setPost(foundPost);
      
      if (!foundPost) {
        Alert.alert(
          'Post Not Found',
          'This post may have been deleted or is no longer available.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }
  }, [postId, posts]);

  const handleDeletePost = () => {
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
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleDeleteComment = (commentId) => {
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

  const handleReply = (comment) => {
    setReplyToComment(comment);
    setShowCommentModal(true);
  };

  const submitComment = () => {
    if (!commentText.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }
    addComment(
      postId, 
      commentText, 
      user?.name || 'Anonymous',
      user?.id || 'guest',
      replyToComment?.id || null
    );
    setCommentText('');
    setReplyToComment(null);
    setShowCommentModal(false);
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
              <Text style={styles.commentUserName}>{comment.userName}</Text>
              <Text style={styles.commentTimestamp}>{comment.timestamp}</Text>
            </View>
            {isOwnComment && (
              <TouchableOpacity 
                onPress={() => handleDeleteComment(comment.id)}
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
              onPress={() => handleCommentLike(postId, comment.id)}
            >
              <Text style={styles.commentLikeIcon}>{isLikedComment ? '❤️' : '🤍'}</Text>
              <Text style={[styles.commentLikeText, isLikedComment && styles.commentLikedText]}>
                {comment.likes > 0 ? comment.likes : ''} {comment.likes === 1 ? 'Like' : 'Likes'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.replyButton}
              onPress={() => handleReply(comment)}
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

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <Avatar name={post.userName || 'Surrogate Member'} size={44} style={styles.userAvatar} />
            <View style={styles.postInfo}>
              <Text style={styles.userName}>{post.userName || 'Surrogate Member'}</Text>
              <Text style={styles.timestamp}>{post.timestamp}</Text>
            </View>
            {post.userId === user?.id && (
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={handleDeletePost}
              >
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {post.text ? <Text style={styles.postText}>{post.text}</Text> : null}
          
          {post.image && post.type === 'video' ? (
            <VideoPlayer
              source={{ uri: post.image }}
              style={styles.postVideo}
            />
          ) : post.image ? (
            <Image source={{ uri: post.image }} style={styles.postImage} />
          ) : null}
          
          {/* All Comments */}
          {getComments(postId).length > 0 && (
            <View style={styles.commentsSection}>
              <Text style={styles.commentsSectionTitle}>
                Comments ({countAllComments(getComments(postId))})
              </Text>
              {getComments(postId).map((comment) => renderCommentItem(comment, 0))}
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
                {post.likes > 0 ? post.likes : ''} Like
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowCommentModal(true)}
            >
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionText}>
                {countAllComments(getComments(postId)) > 0 ? countAllComments(getComments(postId)) + ' ' : ''}Comment
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.commentModalOverlay}>
          <View style={styles.commentModalContainer}>
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
                value={commentText}
                onChangeText={setCommentText}
                multiline
                numberOfLines={3}
                autoFocus
              />
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  postText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  postVideo: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  likedIcon: {
    transform: [{ scale: 1.1 }],
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  commentsSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 12,
  },
  commentsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  commentItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  smallUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentInfo: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentTimestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  commentTextFull: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginLeft: 36,
  },
  commentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  commentModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  publishButton: {
    fontSize: 16,
    color: '#2A7BF6',
    fontWeight: '600',
  },
  commentInputContainer: {
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  commentInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    padding: 12,
    backgroundColor: '#F8F9FB',
    borderRadius: 8,
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
  },
  replyButtonText: {
    fontSize: 13,
    color: '#2A7BF6',
    fontWeight: '600',
  },
  repliesContainer: {
    marginLeft: 36,
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#E0E0E0',
  },
  replyItem: {
    marginBottom: 12,
  },
  replyTextFull: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    marginLeft: 28,
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 6,
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
});

