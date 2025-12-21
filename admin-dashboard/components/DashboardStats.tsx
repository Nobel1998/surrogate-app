'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Stats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  totalEvents: number;
  activeEvents: number;
  upcomingEvents: number;
}

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    totalEvents: 0,
    activeEvents: 0,
    upcomingEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // 获取Applications统计
      const { data: applications } = await supabase
        .from('applications')
        .select('status');

      // 获取Events统计  
      const { data: events } = await supabase
        .from('events')
        .select('status, event_date');

      const now = new Date();
      
      setStats({
        totalApplications: applications?.length || 0,
        pendingApplications: applications?.filter(app => !app.status || app.status === 'pending').length || 0,
        approvedApplications: applications?.filter(app => app.status === 'approved').length || 0,
        totalEvents: events?.length || 0,
        activeEvents: events?.filter(event => event.status === 'active').length || 0,
        upcomingEvents: events?.filter(event => 
          event.status === 'active' && new Date(event.event_date) > now
        ).length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Applications',
      value: stats.totalApplications,
      icon: '📋',
      color: 'blue',
    },
    {
      title: 'Pending Applications',
      value: stats.pendingApplications,
      icon: '⏳',
      color: 'yellow',
    },
    {
      title: 'Approved Applications',
      value: stats.approvedApplications,
      icon: '✅',
      color: 'green',
    },
    {
      title: 'Total Events',
      value: stats.totalEvents,
      icon: '📅',
      color: 'purple',
    },
    {
      title: 'Active Events',
      value: stats.activeEvents,
      icon: '🎯',
      color: 'indigo',
    },
    {
      title: 'Upcoming Events',
      value: stats.upcomingEvents,
      icon: '⏰',
      color: 'pink',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      pink: 'bg-pink-50 text-pink-700 border-pink-200',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {statCards.map((card, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            </div>
            <div className={`p-3 rounded-full ${getColorClasses(card.color)}`}>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

















