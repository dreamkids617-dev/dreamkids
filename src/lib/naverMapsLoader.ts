const NAVER_MAPS_SCRIPT_ID = 'dreamkids-naver-openapi-v3';

let loadPromise: Promise<void> | null = null;

function isNaverMapsReady(): boolean {
  return typeof window !== 'undefined' && !!window.naver?.maps?.Map;
}

function rejectMissingClientId(): Promise<void> {
  return Promise.reject(new Error('VITE_NAVER_MAP_CLIENT_ID is not set'));
}

/**
 * Loads Naver Maps JavaScript API v3 once (dedupes by script id + shared promise).
 * Uses only the public key id value from VITE_NAVER_MAP_CLIENT_ID as ncpKeyId (no client secret).
 */
export function loadNaverMapsScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (isNaverMapsReady()) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID?.trim();
  if (!clientId) {
    return rejectMissingClientId();
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const finishOk = () => {
      if (isNaverMapsReady()) resolve();
      else {
        loadPromise = null;
        reject(new Error('Naver Maps API unavailable after script load'));
      }
    };

    const finishErr = () => {
      loadPromise = null;
      reject(new Error('Failed to load Naver Maps script'));
    };

    const existing = document.getElementById(NAVER_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (isNaverMapsReady()) {
        finishOk();
        return;
      }
      existing.addEventListener('load', finishOk, { once: true });
      existing.addEventListener('error', finishErr, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = NAVER_MAPS_SCRIPT_ID;
    script.async = true;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`;
    script.addEventListener('load', finishOk, { once: true });
    script.addEventListener('error', finishErr, { once: true });
    document.head.appendChild(script);
  });

  return loadPromise.catch(err => {
    loadPromise = null;
    throw err;
  });
}
