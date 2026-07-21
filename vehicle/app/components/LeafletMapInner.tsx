'use client';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;

  return (
    <MapContainer center={center} zoom={15} style={{ width: '100%', height }} scrollWheelZoom>
      <TileLayer
        url="/api/map/tile/{z}/{x}/{y}"
        attribution='&copy; <a href="https://neshan.org">نشان</a>'
        maxZoom={19}
      />
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
      <ClickHandler onPick={onPick} />
    </MapContainer>
  );
}
