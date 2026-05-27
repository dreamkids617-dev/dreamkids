import { useEffect, useRef, useState } from 'react';
import type { Institution } from '@/lib/supabase';
import { loadNaverMapsScript } from '@/lib/naverMapsLoader';

/** Narrow view of Naver map instances (script-loaded API). */
type NaverMapLike = {
  setCenter: (ll: unknown) => void;
  setZoom: (z: number) => void;
  fitBounds: (bounds: unknown) => void;
  destroy?: () => void;
};

type NaverMarkerLike = {
  setMap: (map: NaverMapLike | null) => void;
};

const DEFAULT_CENTER = { lat: 37.503, lng: 126.766 };
const DEFAULT_ZOOM = 14;

export type NaverMapViewProps = {
  institutions: Institution[];
  onMarkerClick: (institutionId: string) => void;
  className?: string;
};

/**
 * Naver Map with markers for the given institutions (caller should pass only rows with valid coordinates).
 */
export default function NaverMapView({ institutions, onMarkerClick, className }: NaverMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMapLike | null>(null);
  const markersRef = useRef<{ marker: NaverMarkerLike; listener: unknown }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    setLoadError(null);
    setMapReady(false);

    void loadNaverMapsScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const maps = window.naver?.maps;
        if (!maps) {
          setLoadError('지도 API를 불러오지 못했습니다.');
          return;
        }

        const center = new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
        const map = new maps.Map(containerRef.current, {
          center,
          zoom: DEFAULT_ZOOM,
        }) as NaverMapLike;
        mapRef.current = map;
        setMapReady(true);

        requestAnimationFrame(() => {
          if (cancelled || !mapRef.current) return;
          maps.Event.trigger(mapRef.current, 'resize');
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError('지도를 불러오지 못했습니다. 환경 설정을 확인해 주세요.');
      });

    return () => {
      cancelled = true;
      setMapReady(false);
      for (const { marker, listener } of markersRef.current) {
        try {
          window.naver?.maps?.Event.removeListener(listener);
        } catch {
          /* ignore */
        }
        marker.setMap(null);
      }
      markersRef.current = [];
      if (mapRef.current?.destroy) {
        mapRef.current.destroy();
      }
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const maps = window.naver?.maps;
    if (!map || !maps) return;

    for (const { marker, listener } of markersRef.current) {
      try {
        maps.Event.removeListener(listener);
      } catch {
        /* ignore */
      }
      marker.setMap(null);
    }
    markersRef.current = [];

    const coords: { lat: number; lng: number; id: string }[] = [];
    for (const inst of institutions) {
      const lat = Number(inst.latitude);
      const lng = Number(inst.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      coords.push({ lat, lng, id: inst.id });
    }

    const center = new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);

    if (coords.length === 0) {
      map.setCenter(center);
      map.setZoom(DEFAULT_ZOOM);
      requestAnimationFrame(() => maps.Event.trigger(map, 'resize'));
      return;
    }

    for (const { lat, lng, id } of coords) {
      const position = new maps.LatLng(lat, lng);
      const marker = new maps.Marker({
        position,
        map,
        title: institutions.find(i => i.id === id)?.name,
      }) as NaverMarkerLike;
      const listener = maps.Event.addListener(marker, 'click', () => {
        onMarkerClick(id);
      });
      markersRef.current.push({ marker, listener });
    }

    if (coords.length === 1) {
      map.setCenter(new maps.LatLng(coords[0].lat, coords[0].lng));
      map.setZoom(DEFAULT_ZOOM);
    } else {
      const bounds = new maps.LatLngBounds(
        new maps.LatLng(coords[0].lat, coords[0].lng),
        new maps.LatLng(coords[0].lat, coords[0].lng)
      );
      for (let i = 1; i < coords.length; i++) {
        bounds.extend(new maps.LatLng(coords[i].lat, coords[i].lng));
      }
      map.fitBounds(bounds);
    }

    requestAnimationFrame(() => maps.Event.trigger(map, 'resize'));
  }, [mapReady, institutions, onMarkerClick]);

  return (
    <div className={`relative min-h-[200px] ${className ?? ''}`}>
      {loadError ? (
        <div className="absolute inset-0 z-[1] flex items-center justify-center rounded-[14px] bg-slate-100 text-center text-[12px] text-slate-600 px-4">
          {loadError}
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full min-h-[200px]" role="presentation" />
    </div>
  );
}
