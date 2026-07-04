import { Platform } from 'react-native';

const PRODUCTION_URL = process.env.EXPO_PUBLIC_PROD_API_URL;
const DEFAULT_DEV_URL = Platform.OS === 'android' ? 'http://[IP_ADDRESS]' : 'http://localhost:8000';

export const API_BASE_URL = __DEV__ 
  ? (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_DEV_URL)
  : PRODUCTION_URL;
