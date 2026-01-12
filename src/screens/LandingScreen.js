import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ImageBackground, Dimensions, Image, Platform } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LandingScreen({ navigation }) {
  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=2070&auto=format&fit=crop' }} // Warm, high-quality family/support background
      style={styles.backgroundImage}
      blurRadius={Platform.OS === 'ios' ? 8 : 3} // Soft blur for readability
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        
        <View style={styles.overlay} />

        <View style={styles.contentContainer}>
          {/* Header / Brand */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Icon name="heart" size={32} color="#fff" />
            </View>
            <Text style={styles.brandName}>BabyTree</Text>
          </View>

          <View style={styles.mainContent}>
            <Text style={styles.tagline}>Creating Families,{'\n'}Together.</Text>
            <Text style={styles.description}>
              Join a trusted community dedicated to bringing new life into the world. Whether you're here to help or to grow your family, we're with you every step.
            </Text>
          </View>

          {/* Action Cards */}
          <View style={styles.actionsContainer}>
            {/* Surrogate Path */}
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('SurrogateApplication')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                <Icon name="gift" size={24} color="#2A7BF6" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Become a Surrogate</Text>
                <Text style={styles.cardSubtitle}>Start your application journey</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#A0A3BD" />
            </TouchableOpacity>

            {/* Intended Parents Path */}
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('IntendedParentApplication')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
                <Icon name="heart" size={24} color="#22C55E" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Become Intended Parents</Text>
                <Text style={styles.cardSubtitle}>Start your family journey</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#A0A3BD" />
            </TouchableOpacity>

            {/* Auth Path (parents & surrogates) */}
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('LoginScreen')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FFF0F3' }]}>
                <Icon name="users" size={24} color="#FF8EA4" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Login / Sign Up</Text>
                <Text style={styles.cardSubtitle}>Access your portal to apply or connect</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#A0A3BD" />
            </TouchableOpacity>
          </View>

          {/* Footer Links */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.blogLink}
              onPress={() => navigation.navigate('GuestTabs', { screen: 'Blog' })}
            >
              <Icon name="book-open" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.blogLinkText}>Read Our Blog</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  safeArea: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 29, 30, 0.65)', // Dark overlay for text contrast
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  mainContent: {
    marginTop: 40,
    marginBottom: 'auto',
  },
  tagline: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 48,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 24,
    maxWidth: '90%',
  },
  actionsContainer: {
    gap: 16,
    marginBottom: 30,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Slight transparency
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6E7191',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  blogLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  blogLinkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
