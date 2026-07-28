import { Alert, Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import {
  ANDROID_PLAY_STORE_PUBLISHED,
  ANDROID_PLAY_STORE_URL,
  COMPANY_YELP_REVIEW_URL,
  IOS_APP_STORE_REVIEW_ITMS_URL,
  IOS_APP_STORE_REVIEW_URL,
  IOS_APP_STORE_URL,
} from '../constants/appStore';

const resolveIosReviewUrl = (storeUrl) => {
  if (!storeUrl) return IOS_APP_STORE_REVIEW_URL;
  if (storeUrl.includes('action=write-review')) return storeUrl;
  return `${storeUrl}${storeUrl.includes('?') ? '&' : '?'}action=write-review`;
};

const openUrl = async (url, t, fallbackUrl, errorKey = 'profile.rateAppError') => {
  for (const candidate of [url, fallbackUrl].filter(Boolean)) {
    try {
      const isHttp = /^https?:\/\//i.test(candidate);
      const supported = isHttp ? true : await Linking.canOpenURL(candidate);
      if (supported) {
        await Linking.openURL(candidate);
        return true;
      }
    } catch {
      // Try next candidate.
    }
  }
  Alert.alert(t('common.error'), t(errorKey));
  return false;
};

const openIosReviewPage = (storeUrl, t) =>
  openUrl(IOS_APP_STORE_REVIEW_ITMS_URL, t, resolveIosReviewUrl(storeUrl));

const promptOpenStore = (url, t, { ios = false } = {}) => {
  Alert.alert(t('profile.rateApp'), t('profile.rateAppOpenStore'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('profile.openStore'),
      onPress: () => (ios ? openIosReviewPage(url, t) : openUrl(url, t)),
    },
  ]);
};

const canRequestInAppReview = async () => {
  if (StoreReview.isAvailableAsync && (await StoreReview.isAvailableAsync())) {
    return true;
  }
  if (typeof StoreReview.hasAction === 'function' && (await StoreReview.hasAction())) {
    return true;
  }
  return false;
};

const scheduleOpenStorePrompt = (storeUrl, t) => {
  // Avoid overlapping with the native SKStoreReviewController sheet.
  setTimeout(() => promptOpenStore(storeUrl, t, { ios: true }), 600);
};

const handleIosRateApp = async (t) => {
  let storeUrl = IOS_APP_STORE_URL;

  try {
    if (typeof StoreReview.storeUrl === 'function') {
      storeUrl = StoreReview.storeUrl() || IOS_APP_STORE_URL;
    }
  } catch {
    storeUrl = IOS_APP_STORE_URL;
  }

  if (await canRequestInAppReview()) {
    try {
      await StoreReview.requestReview();
    } catch {
      // Fall through to App Store link.
    }
    scheduleOpenStorePrompt(storeUrl, t);
    return;
  }

  promptOpenStore(storeUrl, t, { ios: true });
};

const handleAndroidRateApp = async (t) => {
  if (!ANDROID_PLAY_STORE_PUBLISHED) {
    Alert.alert(t('profile.rateApp'), t('profile.rateAppAndroidComingSoon'));
    return;
  }

  let storeUrl = ANDROID_PLAY_STORE_URL;
  try {
    if (typeof StoreReview.storeUrl === 'function') {
      storeUrl = StoreReview.storeUrl() || ANDROID_PLAY_STORE_URL;
    }
  } catch {
    storeUrl = ANDROID_PLAY_STORE_URL;
  }

  if (typeof StoreReview.hasAction === 'function' && (await StoreReview.hasAction())) {
    try {
      await StoreReview.requestReview();
    } catch {
      // Fall through to Play Store link.
    }
  }

  promptOpenStore(storeUrl, t);
};

export const handleRateApp = async (t) => {
  try {
    if (Platform.OS === 'ios') {
      await handleIosRateApp(t);
      return;
    }

    if (Platform.OS === 'android') {
      await handleAndroidRateApp(t);
      return;
    }

    Alert.alert(t('profile.rateApp'), t('profile.rateAppNotPublished'));
  } catch {
    Alert.alert(t('common.error'), t('profile.rateAppError'));
  }
};

export const handleRateUs = (t) => {
  Alert.alert(t('profile.rateUs'), t('profile.rateUsOpenYelp'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('profile.openYelp'),
      onPress: () => openUrl(COMPANY_YELP_REVIEW_URL, t, null, 'profile.rateUsError'),
    },
  ]);
};
