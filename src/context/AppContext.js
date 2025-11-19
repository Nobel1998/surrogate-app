import React, { createContext, useContext, useState } from 'react';

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
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [likedEvents, setLikedEvents] = useState(new Set());

  const addPost = (post) => {
    setPosts(prev => [post, ...prev]);
  };

  const addEvent = (event) => {
    const newEvent = {
      ...event,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      likes: 0,
      comments: 0
    };
    setEvents(prev => [newEvent, ...prev]);
  };

  const handleLike = (postId) => {
    if (likedPosts.has(postId)) {
      // 取消点赞
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post
      ));
    } else {
      // 点赞
      setLikedPosts(prev => new Set([...prev, postId]));
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      ));
    }
  };

  const handleEventLike = (eventId) => {
    if (likedEvents.has(eventId)) {
      // 取消点赞
      setLikedEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, likes: Math.max(0, event.likes - 1) } : event
      ));
    } else {
      // 点赞
      setLikedEvents(prev => new Set([...prev, eventId]));
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, likes: event.likes + 1 } : event
      ));
    }
  };

  const value = {
    posts,
    events,
    likedPosts,
    likedEvents,
    addPost,
    addEvent,
    handleLike,
    handleEventLike
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

