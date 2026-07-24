import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { useSightingsStore } from "@/store/sightingsStore";
import { usePostModal } from "@/components/modals/PostDetailModal";
import type { Sighting } from "@/types";

const PIN_ICON = L.divIcon({
  className: "bio-pin",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 24 24" fill="#22c55e" stroke="#0e1710" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#0e1710" stroke="none"/></svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -36],
});

function LocationController({
  target,
}: {
  target: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 12);
  }, [target, map]);
  return null;
}

function useClusters(sightings: Sighting[]) {
  return useMemo(() => {
    const cells = new Map<string, Sighting[]>();
    for (const s of sightings) {
      if (!s.latitude && !s.longitude) continue;
      const key = `${Math.round(s.latitude / 0.5)}:${Math.round(s.longitude / 0.5)}`;
      const arr = cells.get(key) ?? [];
      arr.push(s);
      cells.set(key, arr);
    }
    return Array.from(cells.values());
  }, [sightings]);
}

export function BiodiversityMap({
  sightings: propSightings,
  className,
}: {
  sightings?: Sighting[];
  className?: string;
}) {
  const storeSightings = useSightingsStore((s) => s.sightings);
  const loadMore = useSightingsStore((s) => s.loadMore);
  const { openPost } = usePostModal();
  const mapRef = useRef<L.Map | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const initializedRef = useRef(false);

  const sightings = propSightings ?? storeSightings;

  useEffect(() => {
    if (propSightings === undefined && !initializedRef.current && sightings.length === 0) {
      initializedRef.current = true;
      loadMore();
    }
  }, [propSightings, sightings.length, loadMore]);

  const clusters = useClusters(sightings);

  const locateMe = () => {
    if (!navigator.geolocation) {
      setUserLoc({ lat: 4.71, lng: -74.07 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLoc({ lat: 4.71, lng: -74.07 }),
    );
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={locateMe}
        aria-label="Centrar en mi ubicación"
        className="absolute bottom-4 right-4 z-[1000] grid h-12 w-12 place-items-center rounded-full bg-bio-500 text-forest-950 shadow-lg shadow-bio-500/40 ring-4 ring-forest-950 transition hover:bg-bio-400"
      >
        <Crosshair size={22} />
      </button>

      <MapContainer
        ref={mapRef}
        center={[2.5, -73]}
        zoom={5}
        scrollWheelZoom
        className="h-full w-full bg-forest-800"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <LocationController target={userLoc} />

        {clusters.map((group, i) => {
          const lat = group[0].latitude;
          const lng = group[0].longitude;
          const multiple = group.length > 1;
          return (
            <Marker
              key={i}
              position={[lat, lng]}
              icon={PIN_ICON}
              alt={`${group.length} avistamiento(s) en ${group[0].location}`}
              eventHandlers={{ click: () => openPost(group[0].id) }}
            >
              <Popup>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-forest-950">
                    {multiple
                      ? `${group.length} avistamientos`
                      : group[0].commonName}
                  </p>
                  {!multiple && (
                    <>
                      <p className="text-xs italic text-forest-800">
                        {group[0].species}
                      </p>
                      <p className="text-xs text-forest-800">{group[0].location}</p>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
