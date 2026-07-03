// Development: point to local backend
// Production: set EXPO_PUBLIC_API_URL in your Netlify/EAS environment
const DEV_API_URL = 'http://localhost:8000';
const PROD_API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEV_API_URL;

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
