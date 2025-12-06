import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorageLib from '../utils/Storage';
import { supabase } from '../lib/supabase';
import { uploadMedia, deleteMedia } from '../utils/mediaUpload';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [userLikes, setUserLikes] = useState({}); // userId -> { posts: Set, events: Set }
  const [userRegistrations, setUserRegistrations] = useState({}); // userId -> Set of eventIds
  const [commentLikes, setCommentLikes] = useState({}); // userId -> Set of commentIds
  const [comments, setComments] = useState({}); // postId -> array of comments
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Load data from cloud on mount with retry mechanism
  useEffect(() => {
    const loadWithRetry = async (retries = 2) => { // 减少重试次数
      for (let i = 0; i < retries; i++) {
        try {
          await loadDataFromCloud();
          break; // 成功则跳出循环
        } catch (error) {
          if (error.message === 'Data loading timeout') {
            console.log(`⏱️ Data loading attempt ${i + 1} timed out (this is normal for slow connections)`);
          } else {
            console.log(`Data loading attempt ${i + 1} failed:`, error.message);
          }
          if (i === retries - 1) {
            console.log('All retry attempts completed, using local data');
            try {
              await loadDataFromLocal();
            } catch (localError) {
              console.error('Local data loading also failed:', localError);
              // 即使本地数据加载失败，也要完成初始化
              setIsLoading(false);
              setHasInitiallyLoaded(true);
            }
          } else {
            // 等待更短时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒重试间隔
          }
        }
      }
    };
    
    // 应急超时机制：无论如何，10秒后强制完成加载
    const emergencyTimeout = setTimeout(() => {
      console.log('🚨 Emergency timeout: Forcing AppContext loading completion');
      setIsLoading(false);
      setHasInitiallyLoaded(true);
    }, 10000);
    
    loadWithRetry().finally(() => {
      clearTimeout(emergencyTimeout);
    });
    
    return () => clearTimeout(emergencyTimeout);
  }, []);

  // Save events to local storage (events are still local/mock)
  useEffect(() => {
    if (!isLoading) {
      saveEventsToLocal();
    }
  }, [events, isLoading]);

  // 从云端加载数据
  const loadDataFromCloud = async (isInitialLoad = true) => {
    try {
      // 只在初始加载时显示 loading
      if (isInitialLoad) {
        setIsLoading(true);
      }
      
      // 添加超时机制，防止无限加载
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Data loading timeout')), 25000); // 25秒超时
      });
      
      // 并行加载帖子和评论，限制数量以提高性能
      const dataPromise = Promise.all([
        supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50), // 限制加载最近 50 条帖子
        supabase
          .from('comments')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(200) // 限制加载最近 200 条评论
      ]);
      
      const [postsResult, commentsResult] = await Promise.race([
        dataPromise,
        timeoutPromise
      ]);

      if (postsResult.error) {
        console.error('Error loading posts from cloud:', postsResult.error);
        // 如果云端加载失败，尝试从本地加载
        if (isInitialLoad) {
          console.log('Falling back to local data...');
          await loadDataFromLocal();
        } else {
          // 刷新时失败，保持现有数据
          console.log('Cloud refresh failed, keeping existing data');
        }
        return;
      }

      // 转换帖子数据格式
      const cloudPosts = (postsResult.data || []).map(post => ({
        id: post.id,
        userId: post.user_id,
        userName: post.user_name,
        content: post.content,
        mediaUri: post.media_uri,
        mediaType: post.media_type,
        likes: post.likes || 0,
        comments: post.comments_count || 0,
        timestamp: new Date(post.created_at).toLocaleString(),
        createdAt: post.created_at,
      }));

      setPosts(cloudPosts);

      // 组织评论数据（支持嵌套）
      if (!commentsResult.error && commentsResult.data) {
        const organizedComments = organizeComments(commentsResult.data);
        setComments(organizedComments);
      }

      // 加载用户点赞状态（仅在初始加载时）
      if (isInitialLoad) {
        await loadUserLikes();
      } else {
        // 刷新时只加载当前用户的点赞状态
        await loadUserLikes();
      }

      // 加载云端 events
      console.log('Loading events from cloud...');
      const { data: eventsData, error: eventsError } = await supabase
        .from('events_with_stats')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false }); // 改为按创建时间倒序，最新的在前面

      console.log('📊 Raw events query result:', { 
        count: eventsData?.length || 0, 
        error: eventsError,
        firstEvent: eventsData?.[0]
      });

      if (eventsError) {
        console.error('Error loading events:', eventsError);
        // 回退到本地存储的events
        const storedEvents = await AsyncStorageLib.getItem('community_events');
        if (storedEvents) {
          setEvents(JSON.parse(storedEvents));
        }
      } else {
        const formattedEvents = (eventsData || []).map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          content: event.content,
          date: new Date(event.event_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          location: event.location || 'TBD',
          category: event.category || 'General',
          image: event.image_url,
          isFeatured: event.is_featured,
          likesCount: event.likes_count || 0,
          registrationCount: event.registration_count || 0,
          maxParticipants: event.max_participants,
          eventDate: event.event_date,
          createdAt: event.created_at
        }));
        setEvents(formattedEvents);
        
        // 同时保存到本地存储作为缓存
        await AsyncStorageLib.setItem('community_events', JSON.stringify(formattedEvents));
        console.log('✅ Events loaded successfully:', formattedEvents.length);
      }

    } catch (error) {
      console.error('Error loading data from cloud:', error);
      
      if (error.message === 'Data loading timeout') {
        console.log('⚠️ Cloud data loading timed out');
      }
      
      // 回退到本地存储
      if (isInitialLoad) {
        console.log('Falling back to local data due to error...');
        try {
          await loadDataFromLocal();
        } catch (localError) {
          console.error('Error loading local data:', localError);
          // 即使本地加载失败，也要设置一些默认值
          setPosts([]);
          setEvents([]);
          setComments({});
        }
      } else {
        // 刷新时失败，保持现有数据
        console.log('Cloud refresh failed due to error, keeping existing data');
      }
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
        setHasInitiallyLoaded(true);
      }
    }
  };

  // 组织评论为嵌套结构
  const organizeComments = (flatComments) => {
    const commentsByPost = {};
    const commentMap = {};

    // 首先创建所有评论的映射
    flatComments.forEach(comment => {
      const formattedComment = {
        id: comment.id,
        text: comment.content,
        userName: comment.user_name,
        userId: comment.user_id,
        timestamp: new Date(comment.created_at).toLocaleString(),
        replyTo: comment.parent_comment_id,
        replies: [],
        likes: comment.likes || 0,
        postId: comment.post_id,
      };
      commentMap[comment.id] = formattedComment;
    });

    // 构建嵌套结构
    flatComments.forEach(comment => {
      const formattedComment = commentMap[comment.id];
      
      if (comment.parent_comment_id && commentMap[comment.parent_comment_id]) {
        // 这是一个回复，添加到父评论的 replies 中
        commentMap[comment.parent_comment_id].replies.push(formattedComment);
      } else {
        // 这是顶级评论
        if (!commentsByPost[comment.post_id]) {
          commentsByPost[comment.post_id] = [];
        }
        commentsByPost[comment.post_id].push(formattedComment);
      }
    });

    return commentsByPost;
  };

  // 加载用户点赞状态
  const loadUserLikes = async () => {
    try {
      // 并行加载所有类型的数据
      const [postLikesResult, commentLikesResult, eventLikesResult, eventRegistrationsResult] = await Promise.all([
        supabase.from('post_likes').select('post_id, user_id'),
        supabase.from('comment_likes').select('comment_id, user_id'),
        supabase.from('event_likes').select('event_id, user_id'),
        supabase.from('event_registrations').select('event_id, user_id').eq('status', 'registered')
      ]);

      // 组织帖子和事件点赞数据
      const likesMap = {};
      
      // 处理帖子点赞
      (postLikesResult.data || []).forEach(like => {
        if (!likesMap[like.user_id]) {
          likesMap[like.user_id] = { posts: new Set(), events: new Set() };
        }
        likesMap[like.user_id].posts.add(like.post_id);
      });
      
      // 处理事件点赞
      (eventLikesResult.data || []).forEach(like => {
        if (!likesMap[like.user_id]) {
          likesMap[like.user_id] = { posts: new Set(), events: new Set() };
        }
        likesMap[like.user_id].events.add(like.event_id);
      });
      
      setUserLikes(likesMap);

      // 组织用户注册数据
      const registrationsMap = {};
      (eventRegistrationsResult.data || []).forEach(registration => {
        if (!registrationsMap[registration.user_id]) {
          registrationsMap[registration.user_id] = new Set();
        }
        registrationsMap[registration.user_id].add(registration.event_id);
      });
      setUserRegistrations(registrationsMap);
      
      console.log('✅ User data loaded:', {
        posts: postLikesResult.data?.length || 0,
        events: eventLikesResult.data?.length || 0,
        comments: commentLikesResult.data?.length || 0,
        registrations: eventRegistrationsResult.data?.length || 0
      });

      // 组织评论点赞数据
      const commentLikesMap = {};
      (commentLikesResult.data || []).forEach(like => {
        if (!commentLikesMap[like.user_id]) {
          commentLikesMap[like.user_id] = new Set();
        }
        commentLikesMap[like.user_id].add(like.comment_id);
      });
      setCommentLikes(commentLikesMap);

    } catch (error) {
      console.error('Error loading user likes:', error);
    }
  };

  // 从本地加载数据（回退方案）
  const loadDataFromLocal = async () => {
    try {
      const [storedPosts, storedEvents, storedComments, storedUserLikes, storedUserRegistrations] = await Promise.all([
        AsyncStorageLib.getItem('community_posts'),
        AsyncStorageLib.getItem('community_events'),
        AsyncStorageLib.getItem('community_comments'),
        AsyncStorageLib.getItem('community_user_likes'),
        AsyncStorageLib.getItem('community_user_registrations'),
      ]);

      if (storedPosts) {
        setPosts(JSON.parse(storedPosts));
      }
      if (storedEvents) {
        setEvents(JSON.parse(storedEvents));
      }
      if (storedComments) {
        setComments(JSON.parse(storedComments));
      }
      if (storedUserLikes) {
        const parsedLikes = JSON.parse(storedUserLikes);
        const converted = {};
        Object.keys(parsedLikes).forEach(userId => {
          converted[userId] = {
            posts: new Set(parsedLikes[userId].posts || []),
            events: new Set(parsedLikes[userId].events || []),
          };
        });
        setUserLikes(converted);
      }
      if (storedUserRegistrations) {
        const parsedRegistrations = JSON.parse(storedUserRegistrations);
        const convertedRegistrations = {};
        Object.keys(parsedRegistrations).forEach(userId => {
          convertedRegistrations[userId] = new Set(parsedRegistrations[userId] || []);
        });
        setUserRegistrations(convertedRegistrations);
      }

      const storedCommentLikes = await AsyncStorageLib.getItem('community_comment_likes');
      if (storedCommentLikes) {
        const parsedCommentLikes = JSON.parse(storedCommentLikes);
        const convertedCommentLikes = {};
        Object.keys(parsedCommentLikes).forEach(userId => {
          convertedCommentLikes[userId] = new Set(parsedCommentLikes[userId] || []);
        });
        setCommentLikes(convertedCommentLikes);
      }
    } catch (error) {
      console.error('Error loading data from local:', error);
    }
  };

  // 保存 events 到本地（events 暂时还是本地的）
  const saveEventsToLocal = async () => {
    try {
      await AsyncStorageLib.setItem('community_events', JSON.stringify(events));
    } catch (error) {
      console.error('Error saving events:', error);
    }
  };

  const setCurrentUser = async (userId) => {
    console.log('Setting current user:', userId);
    setCurrentUserId(userId);
    if (userId && !userLikes[userId]) {
      setUserLikes(prev => ({
        ...prev,
        [userId]: { posts: new Set(), events: new Set() }
      }));
    }
    
    // 如果用户刚登录且数据还在加载中，重新加载数据
    if (userId && isLoading) {
      console.log('User logged in while loading, refreshing data...');
      try {
        await loadDataFromCloud(false); // 不显示loading状态，直接刷新
      } catch (error) {
        console.error('Error refreshing data after login:', error);
      }
    }
  };

  const getLikedPosts = () => {
    if (!currentUserId || !userLikes[currentUserId]) return new Set();
    return userLikes[currentUserId].posts || new Set();
  };

  const getLikedEvents = () => {
    if (!currentUserId || !userLikes[currentUserId]) return new Set();
    return userLikes[currentUserId].events || new Set();
  };

  const getRegisteredEvents = () => {
    if (!currentUserId || !userRegistrations[currentUserId]) return new Set();
    return userRegistrations[currentUserId] || new Set();
  };

  // 添加帖子（云端）- 支持媒体上传
  const addPost = async (post, onUploadProgress = () => {}) => {
    try {
      setIsSyncing(true);
      
      // 获取当前认证用户
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      console.log('Auth user check:', authUser ? 'User found' : 'No user', authError);
      
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Authentication error: ${authError.message}`);
      }
      
      if (!authUser) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      // 先添加到本地状态（乐观更新）
      const tempId = Date.now().toString();
      const tempPost = {
        ...post,
        id: tempId,
        timestamp: new Date().toLocaleString(),
        isUploading: true, // 标记正在上传
      };
      setPosts(prev => [tempPost, ...prev]);

      let cloudMediaUri = null;
      
      // 如果有媒体文件，先上传到云端
      if (post.mediaUri && post.mediaType) {
        console.log('Uploading media to cloud storage...');
        onUploadProgress(0, 'Uploading media...');
        
        try {
          cloudMediaUri = await uploadMedia(
            post.mediaUri,
            post.mediaType,
            (progress) => {
              onUploadProgress(progress * 0.8, `Uploading ${post.mediaType}... ${Math.round(progress)}%`);
            }
          );
          console.log('Media uploaded successfully:', cloudMediaUri);
        } catch (uploadError) {
          console.error('Media upload failed:', uploadError);
          // 回滚本地状态
          setPosts(prev => prev.filter(p => p.id !== tempId));
          throw new Error(`Failed to upload ${post.mediaType}: ${uploadError.message}`);
        }
      }

      onUploadProgress(85, 'Saving post...');

      console.log('Attempting to insert post:', {
        user_id: authUser.id,
        user_name: post.userName,
        content: post.content ? `${post.content.substring(0, 20)}...` : 'null',
        media_uri: cloudMediaUri ? 'cloud URL' : 'null',
        media_type: post.mediaType || 'null',
      });

      // 上传到云端 - 使用认证用户的 ID 和云端媒体 URL
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: authUser.id, // 使用 Supabase 认证的用户 ID
          user_name: post.userName,
          content: post.content,
          media_uri: cloudMediaUri, // 使用云端 URL 而不是本地路径
          media_type: post.mediaType || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding post to cloud:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        
        // 如果帖子创建失败，删除已上传的媒体
        if (cloudMediaUri) {
          try {
            await deleteMedia(cloudMediaUri);
          } catch (deleteError) {
            console.error('Failed to delete uploaded media:', deleteError);
          }
        }
        
        // 回滚本地状态
        setPosts(prev => prev.filter(p => p.id !== tempId));
        throw error;
      }
      
      console.log('Post inserted successfully:', data);
      onUploadProgress(100, 'Done!');

      // 用云端返回的真实数据更新本地状态
      const cloudPost = {
        id: data.id,
        userId: data.user_id,
        userName: data.user_name,
        content: data.content,
        mediaUri: data.media_uri,
        mediaType: data.media_type,
        likes: data.likes || 0,
        comments: data.comments_count || 0,
        timestamp: new Date(data.created_at).toLocaleString(),
        createdAt: data.created_at,
      };

      setPosts(prev => prev.map(p => p.id === tempId ? cloudPost : p));
      
      return cloudPost;
    } catch (error) {
      console.error('Error in addPost:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  // 旧的 addEvent 函数已移至底部并重新实现为云端功能

  // 点赞帖子（云端）
  const handleLike = async (postId) => {
    if (!currentUserId) return;

    const currentLikes = getLikedPosts();
    const isLiked = currentLikes.has(postId);

    try {
      if (isLiked) {
        // 取消点赞 - 乐观更新
        setUserLikes(prev => {
          const newUserLikes = { ...prev };
          const newPostLikes = new Set(newUserLikes[currentUserId]?.posts || []);
          newPostLikes.delete(postId);
          newUserLikes[currentUserId] = {
            ...newUserLikes[currentUserId],
            posts: newPostLikes
          };
          return newUserLikes;
      });
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post
      ));

        // 云端删除
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);

        if (error) {
          console.error('Error removing like:', error);
          // 回滚
          setUserLikes(prev => {
            const newUserLikes = { ...prev };
            const newPostLikes = new Set(newUserLikes[currentUserId]?.posts || []);
            newPostLikes.add(postId);
            newUserLikes[currentUserId] = {
              ...newUserLikes[currentUserId],
              posts: newPostLikes
            };
            return newUserLikes;
          });
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      ));
        }
      } else {
        // 点赞 - 乐观更新
        setUserLikes(prev => {
          const newUserLikes = { ...prev };
          if (!newUserLikes[currentUserId]) {
            newUserLikes[currentUserId] = { posts: new Set(), events: new Set() };
          }
          const newPostLikes = new Set(newUserLikes[currentUserId].posts);
          newPostLikes.add(postId);
          newUserLikes[currentUserId] = {
            ...newUserLikes[currentUserId],
            posts: newPostLikes
          };
          return newUserLikes;
        });
        setPosts(prev => prev.map(post => 
          post.id === postId ? { ...post, likes: post.likes + 1 } : post
        ));

        // 云端添加
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: currentUserId,
          });

        if (error) {
          console.error('Error adding like:', error);
          // 回滚
          setUserLikes(prev => {
            const newUserLikes = { ...prev };
            const newPostLikes = new Set(newUserLikes[currentUserId]?.posts || []);
            newPostLikes.delete(postId);
            newUserLikes[currentUserId] = {
              ...newUserLikes[currentUserId],
              posts: newPostLikes
            };
            return newUserLikes;
          });
          setPosts(prev => prev.map(post => 
            post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post
          ));
        }
      }
    } catch (error) {
      console.error('Error in handleLike:', error);
    }
  };

  // 旧的 handleEventLike 函数已移至底部并重新实现为云端功能

  // 删除帖子（云端）
  const deletePost = async (postId, userId) => {
    try {
      // 乐观更新
      const postToDelete = posts.find(p => p.id === postId);
      setPosts(prev => prev.filter(post => post.id !== postId));
      setComments(prev => {
        const newComments = { ...prev };
        delete newComments[postId];
        return newComments;
      });

      // 云端删除
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        // 回滚
        if (postToDelete) {
          setPosts(prev => [postToDelete, ...prev]);
        }
      }
    } catch (error) {
      console.error('Error in deletePost:', error);
    }
  };

  // Helper function to recursively count all comments and replies
  const countAllComments = (comments) => {
    let count = 0;
    comments.forEach(comment => {
      count += 1;
      if (comment.replies && comment.replies.length > 0) {
        count += countAllComments(comment.replies);
      }
    });
    return count;
  };

  // Helper function to recursively add a reply at any level
  const addReplyRecursive = (comments, replyToCommentId, newComment) => {
    return comments.map(comment => {
      if (comment.id === replyToCommentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newComment]
        };
      } else if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReplyRecursive(comment.replies, replyToCommentId, newComment)
        };
      }
      return comment;
    });
  };

  // 添加评论（云端）
  const addComment = async (postId, commentText, userName, userId, replyToCommentId = null) => {
    const tempId = Date.now().toString();
    
    try {
      // 获取当前认证用户
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        throw new Error('User not authenticated');
      }
      
      const newComment = {
        id: tempId,
        text: commentText,
        userName: userName || 'Anonymous',
        userId: authUser.id, // 使用认证用户 ID
        timestamp: new Date().toLocaleString(),
        replyTo: replyToCommentId,
        replies: [],
        likes: 0,
      };

      // 乐观更新本地状态
      setComments(prev => {
        const postComments = prev[postId] || [];
        
        if (replyToCommentId) {
          const updatedComments = addReplyRecursive(postComments, replyToCommentId, newComment);
          return { ...prev, [postId]: updatedComments };
        } else {
          return { ...prev, [postId]: [...postComments, newComment] };
        }
      });

      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, comments: (post.comments || 0) + 1 } : post
      ));

      // 上传到云端 - 使用认证用户的 ID
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          parent_comment_id: replyToCommentId || null,
          user_id: authUser.id, // 使用 Supabase 认证的用户 ID
          user_name: userName || 'Anonymous',
          content: commentText,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding comment to cloud:', error);
        // 回滚
        setComments(prev => {
          const postComments = prev[postId] || [];
          const filteredComments = deleteCommentRecursive(postComments, tempId);
          return { ...prev, [postId]: filteredComments };
        });
        setPosts(prev => prev.map(post => 
          post.id === postId ? { ...post, comments: Math.max(0, (post.comments || 0) - 1) } : post
        ));
        throw error;
      }

      // 用云端返回的真实 ID 更新本地状态
      const updateCommentId = (comments, oldId, newId) => {
        return comments.map(comment => {
          if (comment.id === oldId) {
            return { ...comment, id: newId };
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentId(comment.replies, oldId, newId)
            };
          }
          return comment;
        });
      };

      setComments(prev => {
        const postComments = prev[postId] || [];
        const updatedComments = updateCommentId(postComments, tempId, data.id);
        return { ...prev, [postId]: updatedComments };
      });

    } catch (error) {
      console.error('Error in addComment:', error);
    }
  };

  // Helper function to recursively delete a comment at any level
  const deleteCommentRecursive = (comments, commentId) => {
    return comments.filter(comment => comment.id !== commentId).map(comment => {
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: deleteCommentRecursive(comment.replies, commentId)
        };
      }
      return comment;
    });
  };

  // 删除评论（云端）
  const deleteComment = async (postId, commentId, userId) => {
    try {
      const postComments = comments[postId] || [];
      
      // Calculate how many comments will be deleted
      const countDeletedComments = (comments, targetId) => {
        let count = 0;
        comments.forEach(comment => {
          if (comment.id === targetId) {
            count = 1 + countAllComments(comment.replies || []);
          } else if (comment.replies && comment.replies.length > 0) {
            count += countDeletedComments(comment.replies, targetId);
          }
        });
        return count;
      };

      const deletedCount = countDeletedComments(postComments, commentId);

      // 乐观更新
      setComments(prev => {
        const filteredComments = deleteCommentRecursive(prev[postId] || [], commentId);
        return { ...prev, [postId]: filteredComments };
      });

      if (deletedCount > 0) {
        setPosts(p => p.map(post => 
          post.id === postId ? { ...post, comments: Math.max(0, (post.comments || 0) - deletedCount) } : post
        ));
      }

      // 云端删除（级联删除会自动处理子评论）
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Error deleting comment:', error);
        // 需要重新加载数据来恢复
        await loadDataFromCloud();
      }
    } catch (error) {
      console.error('Error in deleteComment:', error);
    }
  };

  const getComments = (postId) => {
    return comments[postId] || [];
  };

  // Get liked comments for current user
  const getLikedComments = () => {
    if (!currentUserId || !commentLikes[currentUserId]) return new Set();
    return commentLikes[currentUserId];
  };

  // Helper function to update comment likes recursively
  const updateCommentLikesRecursive = (comments, commentId, increment) => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes: Math.max(0, (comment.likes || 0) + increment)
        };
      } else if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentLikesRecursive(comment.replies, commentId, increment)
        };
      }
      return comment;
    });
  };

  // Handle comment like (云端)
  const handleCommentLike = async (postId, commentId) => {
    if (!currentUserId) return;

    const userLikedComments = commentLikes[currentUserId] || new Set();
    const isLiked = userLikedComments.has(commentId);

    try {
      if (isLiked) {
        // Unlike - 乐观更新
        setCommentLikes(prev => {
          const newLikes = { ...prev };
          const newSet = new Set(newLikes[currentUserId] || []);
          newSet.delete(commentId);
          newLikes[currentUserId] = newSet;
          return newLikes;
        });

        setComments(prev => {
          const postComments = prev[postId] || [];
          const updatedComments = updateCommentLikesRecursive(postComments, commentId, -1);
          return { ...prev, [postId]: updatedComments };
        });

        // 云端删除
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUserId);

        if (error) {
          console.error('Error removing comment like:', error);
          // 回滚
          setCommentLikes(prev => {
            const newLikes = { ...prev };
            const newSet = new Set(newLikes[currentUserId] || []);
            newSet.add(commentId);
            newLikes[currentUserId] = newSet;
            return newLikes;
          });
          setComments(prev => {
            const postComments = prev[postId] || [];
            const updatedComments = updateCommentLikesRecursive(postComments, commentId, 1);
            return { ...prev, [postId]: updatedComments };
          });
        }
      } else {
        // Like - 乐观更新
        setCommentLikes(prev => {
          const newLikes = { ...prev };
          if (!newLikes[currentUserId]) {
            newLikes[currentUserId] = new Set();
          }
          const newSet = new Set(newLikes[currentUserId]);
          newSet.add(commentId);
          newLikes[currentUserId] = newSet;
          return newLikes;
        });

        setComments(prev => {
          const postComments = prev[postId] || [];
          const updatedComments = updateCommentLikesRecursive(postComments, commentId, 1);
          return { ...prev, [postId]: updatedComments };
        });

        // 云端添加
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: currentUserId,
          });

        if (error) {
          console.error('Error adding comment like:', error);
          // 回滚
          setCommentLikes(prev => {
            const newLikes = { ...prev };
            const newSet = new Set(newLikes[currentUserId] || []);
            newSet.delete(commentId);
            newLikes[currentUserId] = newSet;
            return newLikes;
          });
          setComments(prev => {
            const postComments = prev[postId] || [];
            const updatedComments = updateCommentLikesRecursive(postComments, commentId, -1);
            return { ...prev, [postId]: updatedComments };
          });
        }
      }
    } catch (error) {
      console.error('Error in handleCommentLike:', error);
    }
  };

  // 刷新数据（不显示 loading 状态，提升性能）
  const refreshData = useCallback(async () => {
    await loadDataFromCloud(false); // false 表示不是初始加载，不显示 loading
  }, []);

  // 强制完成初始加载（用于登录后）
  const forceCompleteLoading = useCallback(() => {
    console.log('Forcing loading completion');
    setIsLoading(false);
    setHasInitiallyLoaded(true);
  }, []);

  // ====== EVENTS 相关函数 ======

  // 添加事件（管理员功能，暂时不在手机端实现）
  const addEvent = (event) => {
    // 这个功能主要在网页端管理后台实现
    console.log('addEvent called, but this is handled in admin dashboard');
  };

  // 处理点赞事件（云端）
  const handleEventLike = async (eventId) => {
    if (!currentUserId) {
      console.log('No current user, cannot like event');
      return;
    }

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('Authentication error for event like:', authError);
        return;
      }

      // 首先查询数据库中的实际状态，而不是依赖本地状态
      const { data: existingLike, error: checkError } = await supabase
        .from('event_likes')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', authUser.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing like:', checkError);
        return;
      }

      const isLikedInDB = !!existingLike;

      if (isLikedInDB) {
        // 取消点赞 - 数据库中存在记录
        const { error } = await supabase
          .from('event_likes')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', authUser.id);

        if (error) {
          console.error('Error removing event like:', error);
          return;
        }

        console.log('✅ Event like removed from database');

        // 更新本地状态
        setUserLikes(prev => {
          const newUserLikes = { ...prev };
          if (!newUserLikes[currentUserId]) {
            newUserLikes[currentUserId] = { posts: new Set(), events: new Set() };
          }
          const newEventLikes = new Set(newUserLikes[currentUserId].events);
          newEventLikes.delete(eventId);
          newUserLikes[currentUserId] = {
            ...newUserLikes[currentUserId],
            events: newEventLikes
          };
          return newUserLikes;
        });
        
        setEvents(prev => 
          prev.map(event => 
            event.id === eventId 
              ? { ...event, likesCount: Math.max(0, (event.likesCount || 0) - 1) } 
              : event
          )
        );
      } else {
        // 添加点赞 - 数据库中不存在记录
        const { error } = await supabase
          .from('event_likes')
          .insert({
            event_id: eventId,
            user_id: authUser.id
          });

        if (error) {
          console.error('Error adding event like:', error);
          return;
        }

        console.log('✅ Event like added to database');

        // 更新本地状态
        setUserLikes(prev => {
          const newUserLikes = { ...prev };
          if (!newUserLikes[currentUserId]) {
            newUserLikes[currentUserId] = { posts: new Set(), events: new Set() };
          }
          const newEventLikes = new Set(newUserLikes[currentUserId].events);
          newEventLikes.add(eventId);
          newUserLikes[currentUserId] = {
            ...newUserLikes[currentUserId],
            events: newEventLikes
          };
          return newUserLikes;
        });
        
        setEvents(prev => 
          prev.map(event => 
            event.id === eventId 
              ? { ...event, likesCount: (event.likesCount || 0) + 1 } 
              : event
          )
        );
      }
    } catch (error) {
      console.error('Error in handleEventLike:', error);
    }
  };

  // 加载用户对事件的点赞状态
  const loadEventLikes = async () => {
    if (!currentUserId) return;

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) return;

      const { data: eventLikesData, error: eventLikesError } = await supabase
        .from('event_likes')
        .select('event_id')
        .eq('user_id', authUser.id);

      if (eventLikesError) {
        console.error('Error loading event likes:', eventLikesError);
        return;
      }

      // 更新用户点赞状态
      setUserLikes(prev => {
        const newUserLikes = { ...prev };
        if (!newUserLikes[currentUserId]) {
          newUserLikes[currentUserId] = { posts: new Set(), events: new Set() };
        }
        
        const eventLikes = new Set((eventLikesData || []).map(like => like.event_id));
        newUserLikes[currentUserId] = {
          ...newUserLikes[currentUserId],
          events: eventLikes
        };
        
        return newUserLikes;
      });
    } catch (error) {
      console.error('Error loading event likes:', error);
    }
  };

  // 事件报名功能
  const registerForEvent = async (eventId) => {
    if (!currentUserId) {
      console.log('No current user, cannot register for event');
      return { success: false, error: 'Please log in to register for events' };
    }

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        return { success: false, error: 'Authentication error' };
      }

      const { data, error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: authUser.id,
          status: 'registered'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'You are already registered for this event' };
        }
        console.error('Error registering for event:', error);
        return { success: false, error: 'Failed to register for event' };
      }

      // 更新本地事件计数
      setEvents(prev => 
        prev.map(event => 
          event.id === eventId 
            ? { ...event, registrationCount: (event.registrationCount || 0) + 1 } 
            : event
        )
      );

      // 更新本地注册状态
      setUserRegistrations(prev => {
        const newRegistrations = { ...prev };
        if (!newRegistrations[currentUserId]) {
          newRegistrations[currentUserId] = new Set();
        }
        const newUserRegistrations = new Set(newRegistrations[currentUserId]);
        newUserRegistrations.add(eventId);
        newRegistrations[currentUserId] = newUserRegistrations;
        return newRegistrations;
      });

      console.log('✅ Event registration successful');
      return { success: true, data };
    } catch (error) {
      console.error('Error in registerForEvent:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  };

  // 监听用户登录状态变化
  useEffect(() => {
    // 这个 useEffect 会在 AuthContext 提供用户信息时触发
    // 由于 AppContext 被 AuthContext 包装，我们需要在 HomeScreen 中处理用户登录后的数据加载
  }, []);

  const value = {
    posts,
    events,
    likedPosts: getLikedPosts(),
    likedEvents: getLikedEvents(),
    registeredEvents: getRegisteredEvents(),
    likedComments: getLikedComments(),
    comments,
    addPost,
    addEvent,
    deletePost,
    handleLike,
    handleEventLike,
    handleCommentLike,
    addComment,
    deleteComment,
    getComments,
    setCurrentUser,
    currentUserId,
    isLoading,
    isSyncing,
    refreshData,
    forceCompleteLoading,
    hasInitiallyLoaded,
    registerForEvent,
    loadEventLikes,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
