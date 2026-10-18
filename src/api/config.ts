/**
 * Loopd API Config
 * Reads API keys from environment variables.
 */
export const ApiConfig = {
  jamendo: {
    baseUrl: 'https://api.jamendo.com/v3.0',
    clientId: process.env.EXPO_PUBLIC_JAMENDO_CLIENT_ID || '',
  },
  deezer: {
    baseUrl: 'https://api.deezer.com',
    // Deezer public API requires no key for most endpoints
    // CORS proxy needed for web, but fine on native
    corsProxy: 'https://corsproxy.io/?',
  },
  audius: {
    discoveryEndpoint: 'https://discoveryprovider.audius.co',
    appName: process.env.EXPO_PUBLIC_AUDIUS_APP_NAME || 'Loopd',
  },
} as const;
