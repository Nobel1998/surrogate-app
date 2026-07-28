import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ImageBackground, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { APP_LANGUAGES } from '../constants/languages';

export default function LandingScreen({ navigation }) {
  const { user, isAuthenticated } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const loggedIn = !!(isAuthenticated && user);

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=2070&auto=format&fit=crop' }}
      style={styles.backgroundImage}
      blurRadius={Platform.OS === 'ios' ? 8 : 3}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        
        <View style={styles.overlay} />

        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <View style={styles.headerBrand}>
              <View style={styles.logoContainer}>
                <Icon name="heart" size={32} color="#fff" />
              </View>
              <Text style={styles.brandName}>BabyTree</Text>
            </View>
            <View style={styles.languageRow}>
              {APP_LANGUAGES.map((lang, index) => {
                const isActive = language === lang.code;
                return (
                  <React.Fragment key={lang.code}>
                    {index > 0 && <Text style={styles.langDivider}>|</Text>}
                    <TouchableOpacity
                      onPress={() => changeLanguage(lang.code)}
                      style={[styles.langChip, isActive && styles.langChipActive]}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <Text style={[styles.langChipText, isActive && styles.langChipTextActive]}>
                        {lang.label}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          <View style={styles.mainContent}>
            <Text style={styles.tagline}>{t('landing.tagline')}</Text>
            <Text style={styles.description}>{t('landing.description')}</Text>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('SurrogateApplication')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                <Icon name="gift" size={24} color="#2A7BF6" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>{t('landing.becomeSurrogate')}</Text>
                <Text style={styles.cardSubtitle}>{t('landing.becomeSurrogateSubtitle')}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#A0A3BD" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('IntendedParentApplication')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
                <Icon name="heart" size={24} color="#22C55E" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>{t('landing.becomeParents')}</Text>
                <Text style={styles.cardSubtitle}>{t('landing.becomeParentsSubtitle')}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#A0A3BD" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.9}
              onPress={() =>
                loggedIn
                  ? navigation.navigate('MainTabs')
                  : navigation.navigate('LoginScreen')
              }
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FFF0F3' }]}>
                <Icon name="users" size={24} color="#FF8EA4" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>
                  {loggedIn ? t('landing.enterApp') : t('landing.loginSignUp')}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {loggedIn ? t('landing.enterAppSubtitle') : t('landing.loginSubtitle')}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#A0A3BD" />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.blogLink}
              onPress={() =>
                loggedIn
                  ? navigation.navigate('MainTabs', { screen: 'Blog' })
                  : navigation.navigate('GuestTabs', { screen: 'Blog' })
              }
            >
              <Icon name="book-open" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.blogLinkText}>{t('landing.readBlog')}</Text>
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
    backgroundColor: 'rgba(26, 29, 30, 0.65)',
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
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 12,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
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
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  langChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  langChipActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  langChipTextActive: {
    color: '#fff',
  },
  langDivider: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginHorizontal: 2,
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
