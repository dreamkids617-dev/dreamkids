// Runtime configuration
let runtimeConfig: {
  API_BASE_URL: string;
} | null = null;

// Configuration loading state
let configLoading = true;

// Default fallback configuration
const defaultConfig = {
  API_BASE_URL: 'http://127.0.0.1:8000', // Only used if runtime config fails to load
};

// Function to load runtime configuration
export async function loadRuntimeConfig(): Promise<void> {
  // Local Vite dev proxies /api to :8000; skip fetch to avoid noisy 500/proxy errors.
  if (import.meta.env.DEV) {
    configLoading = false;
    return;
  }

  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        runtimeConfig = await response.json();
      }
    }
  } catch {
    // Use defaults from getConfig()
  } finally {
    configLoading = false;
  }
}

// Get current configuration
export function getConfig() {
  if (configLoading) {
    return defaultConfig;
  }

  if (runtimeConfig) {
    return runtimeConfig;
  }

  if (import.meta.env.VITE_API_BASE_URL) {
    return {
      API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    };
  }

  return defaultConfig;
}

// Dynamic API_BASE_URL getter - this will always return the current config
export function getAPIBaseURL(): string {
  const baseURL = getConfig().API_BASE_URL;
  // If the base URL is just '/', return empty string to avoid double slashes and incorrect http:// prefix
  if (baseURL === '/') {
    return '';
  }
  return baseURL;
}

// For backward compatibility, but this should be avoided
// Removed static export to prevent using stale config values
// export const API_BASE_URL = getAPIBaseURL();

export const config = {
  get API_BASE_URL() {
    return getAPIBaseURL();
  },
};
