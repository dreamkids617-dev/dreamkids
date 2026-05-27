export {};

/** Minimal runtime typings for Naver Maps JS API v3 (loaded via script). */
declare global {
  interface Window {
    naver?: NaverMapsRoot;
  }
}

interface NaverMapsRoot {
  maps: {
    Map: new (element: HTMLElement, options: { center: unknown; zoom?: number }) => NaverMapInstance;
    Marker: new (options: { position: unknown; map: unknown; title?: string }) => NaverMarkerInstance;
    LatLng: new (lat: number, lng: number) => unknown;
    LatLngBounds: new (sw?: unknown, ne?: unknown) => NaverLatLngBoundsInstance;
    Event: {
      addListener: (target: unknown, event: string, handler: () => void) => unknown;
      removeListener: (listener: unknown) => void;
      trigger: (target: unknown, type: string) => void;
    };
  };
}

interface NaverMapInstance {
  setCenter: (ll: unknown) => void;
  setZoom: (z: number) => void;
  fitBounds: (bounds: unknown) => void;
  destroy?: () => void;
}

interface NaverMarkerInstance {
  setMap: (map: NaverMapInstance | null) => void;
}

interface NaverLatLngBoundsInstance {
  extend: (ll: unknown) => void;
}
