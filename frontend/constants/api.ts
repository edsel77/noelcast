import { Platform } from 'react-native';

const PRODUCTION_URL = process.env.EXPO_PUBLIC_PROD_API_URL;
const DEFAULT_DEV_URL = 'http://localhost:8000'; // Web/iOS dev fallback

export const API_BASE_URL = Platform.OS === 'android' 
  ? PRODUCTION_URL 
  : (__DEV__ ? DEFAULT_DEV_URL : PRODUCTION_URL);
