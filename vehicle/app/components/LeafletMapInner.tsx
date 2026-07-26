'use client';
import { useState, useCallback, useEffect } from 'react';
import { MapContainer, ImageOverlay, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [35.699739, 51.338097]; // تهران

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:30px;height:30px;
    background:#22C55E;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:3px solid white;
    box-shadow:0 3px 12px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// Neshan doesn't expose a working public XYZ tile endpoint for this key, so the map is
// rendered as a static image re-fetched on every pan/zoom and geo-referenced onto the
// Leaflet viewport via project/unproject — same technique used by other in-house projects
// against this API.
function computeBounds(map: L.Map, width: number, height: number): L.LatLngBoundsExpression {
  const zoom = map.getZoom();
  const center = map.getCenter();
  const centerPoint = map.project(center, zoom);
  const halfW = width / 2;
  const halfH = height / 2;
  const topLeft = map.unproject([centerPoint.x - halfW, centerPoint.y - halfH], zoom);
  const bottomRight = map.unproject([centerPoint.x + halfW, centerPoint.y + halfH], zoom);
  return [
    [topLeft.lat, topLeft.lng],
    [bottomRight.lat, bottomRight.lng],
  ];
}

function StaticImageLayer({ onFrame }: { onFrame: (url: string, bounds: L.LatLngBoundsExpression) => void }) {
  const map = useMap();

  const refresh = useCallback(() => {
    const size = map.getSize();
    const width = Math.max(1, Math.round(size.x));
    const height = Math.max(1, Math.round(size.y));
    const center = map.getCenter();
    const zoom = Math.round(map.getZoom());
    const url = `/api/map/static?lat=${center.lat}&lng=${center.lng}&zoom=${zoom}&width=${width}&height=${height}`;
    onFrame(url, computeBounds(map, width, height));
  }, [map, onFrame]);

  useEffect(() => { refresh(); }, [refresh]);
  useMapEvents({ moveend: refresh, zoomend: refresh, resize: refresh });

  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LeafletMapInner({
  lat, lng, onPick, height = 320,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  height?: number;
}) {
  const [frame, setFrame] = useState<{ url: string; bounds: L.LatLngBoundsExpression } | null>(null);
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;

  return (
    <MapContainer center={center} zoom={15} style={{ width: '100%', height, background: '#1a2332' }} scrollWheelZoom>
      {frame && <ImageOverlay url={frame.url} bounds={frame.bounds} />}
      <StaticImageLayer onFrame={(url, bounds) => setFrame({ url, bounds })} />
      <ClickHandler onPick={onPick} />
      {lat != null && lng != null && (
        <Marker
          position={[lat, lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const pos = (e.target as L.Marker).getLatLng();
              onPick(pos.lat, pos.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
