import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorageLib from '../utils/Storage';

const supabaseUrl = 'https://fpuofgrypgabfsbqsxku.supabase.co';
const supabaseKey = 'sb_publishable_KozTC9kRBA8katDpT-rirA_2RQXaPwO';

// 创建符合 Supabase 要求的 storage 适配器
const supabaseStorage = {
  getItem: (key) => AsyncStorageLib.getItem(key),
  setItem: (key, value) => AsyncStorageLib.setItem(key, value),
  removeItem: (key) => AsyncStorageLib.removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        timeout: 30000, // 30秒超时
      });
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
  db: {
    schema: 'public',
  },
});

// 添加连接测试
console.log('🔧 Supabase client initialized with extended timeout');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key length:', supabaseKey.length);
console.log('🔑 Key prefix:', supabaseKey.substring(0, 20) + '...');

