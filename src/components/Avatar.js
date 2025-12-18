import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 预定义的高级配色方案
const AVATAR_COLORS = [
  '#FF6B6B', // 珊瑚红
  '#4ECDC4', // 青绿
  '#45B7D1', // 天蓝
  '#96CEB4', // 薄荷绿
  '#FFEAA7', // 柠檬黄
  '#DDA0DD', // 梅红
  '#98D8C8', // 薄荷
  '#F7DC6F', // 金黄
  '#BB8FCE', // 淡紫
  '#85C1E9', // 浅蓝
  '#F8B500', // 琥珀
  '#00CED1', // 深青
  '#FF7F50', // 珊瑚
  '#9370DB', // 中紫
  '#20B2AA', // 浅海绿
  '#FF69B4', // 热粉
  '#32CD32', // 酸橙绿
  '#FFD700', // 金色
  '#BA55D3', // 中兰紫
  '#00FA9A', // 中春绿
];

// 根据字符串生成一致的颜色索引
const getColorFromName = (name) => {
  if (!name || name.length === 0) return AVATAR_COLORS[0];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

// 获取用户名的首字母（支持中文）
const getInitials = (name) => {
  if (!name || name.length === 0) return '?';
  
  // 去除空格并获取第一个字符
  const trimmedName = name.trim();
  
  // 检查是否是中文字符
  const firstChar = trimmedName.charAt(0);
  if (/[\u4e00-\u9fa5]/.test(firstChar)) {
    // 中文：直接返回第一个字
    return firstChar;
  }
  
  // 英文：获取首字母（最多两个）
  const words = trimmedName.split(' ').filter(word => word.length > 0);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  return trimmedName.charAt(0).toUpperCase();
};

const Avatar = ({ name, size = 40, style }) => {
  const backgroundColor = getColorFromName(name);
  const initials = getInitials(name);
  const fontSize = size * 0.4;
  
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default Avatar;















