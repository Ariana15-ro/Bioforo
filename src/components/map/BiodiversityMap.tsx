import * as L from "leaflet";
import "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Crosshair, LocateFixed } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

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

function MarkerClusterLayer({
  sightings,
  openPost,
}: {
  sightings: Sighting[];
  openPost: (id: string) => void;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        const el = document.createElement("div");
        el.textContent = String(count);
        el.style.cssText = `
          background: rgba(34,197,94,0.9);
          color: #0e1710;
          font-weight: 700;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 9999px;
          border: 2px solid #0e1710;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          white-space: nowrap;
        `;
        return L.divIcon({
          html: el.outerHTML,
          className: "bio-cluster-icon",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      },
    });

    clusterRef.current = cluster;
    map.addLayer(cluster);

    return () => {
      map.removeLayer(cluster);
      clusterRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();

    const markers = sightings
      .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
      .map((s) => {
        const marker = L.marker([s.latitude, s.longitude], { icon: PIN_ICON });
        const image = s.imageUrl ? `<img src="${s.imageUrl}" alt="" className="h-24 w-full rounded-lg object-cover" />` : null;
        marker.bindPopup(
          `<div style="min-width:160px;color:#0e1710;">
            ${image ?? ""}
            <p style="font-weight:700;font-size:14px;margin-top:6px;">${escapeHtml(s.commonName)}</p>
            <p style="font-size:11px;color:#14532d;margin-top:2px;">${escapeHtml(s.category)}</p>
            <p style="font-size:11px;color:#14532d;margin-top:2px;">${escapeHtml(s.location)}</p>
            <button data-sighting-id="${s.id}" style="
              margin-top:8px;
              width:100%;
              background:#22c55e;
              color:#0e1710;
              border:2px solid #0e1710;
              border-radius:9999px;
              padding:6px 0;
              font-weight:700;
              font-size:12px;
              cursor:pointer;
            ">Ver detalle</button>
          </div>`,
          { className: "bio-popup", minWidth: 180, maxWidth: 220 },
        );
        marker.on("popupopen", () => {
          const btn = document.querySelector(`button[data-sighting-id="${s.id}"]`);
          if (btn) {
            btn.addEventListener("click", () => {
              openPost(s.id);
            });
          }
        });
        return marker;
      });

    cluster.addLayers(markers);
  }, [sightings, map, openPost]);

  return null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function BiodiversityMap({
  sightings: propSightings,
  className,
}: {
  sightings?: Sighting[];
  className?: string;
}) {
  const { openPost } = usePostModal();
  const mapRef = useRef<L.Map | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyFilter, setNearbyFilter] = useState<{ lat: number; lng: number; radiusKm: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sightings = propSightings ?? [];

  const filtered = useMemo(() => {
    if (!nearbyFilter) return sightings;
    return sightings.filter((s) => {
      if (!Number.isFinite(s.latitude) || !Number.isFinite(s.longitude)) return false;
      const d = haversineKm(nearbyFilter.lat, nearbyFilter.lng, s.latitude, s.longitude);
      return d <= nearbyFilter.radiusKm;
    });
  }, [sightings, nearbyFilter]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setUserLoc({ lat: 4.71, lng: -74.07 });
      showToast("Geolocalización no disponible. Usando ubicación de ejemplo.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLoc({ lat: latitude, lng: longitude });
        setNearbyFilter({ lat: latitude, lng: longitude, radiusKm: 50 });
        showToast("Mostrando avistamientos a 50 km de tu ubicación.");
      },
      () => {
        setUserLoc({ lat: 4.71, lng: -74.07 });
        setNearbyFilter(null);
        showToast("No se pudo obtener tu ubicación. Usando ubicación de ejemplo.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const clearNearby = () => {
    setNearbyFilter(null);
    setToast("Filtro de cercanía desactivado.");
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          type="button"
          onClick={locateMe}
          aria-label="Cerca de mí"
          className="grid h-12 w-12 place-items-center rounded-full bg-bio-500 text-forest-950 shadow-lg shadow-bio-500/40 ring-4 ring-forest-950 transition hover:bg-bio-400"
        >
          <LocateFixed size={22} />
        </button>
        {nearbyFilter && (
          <button
            type="button"
            onClick={clearNearby}
            aria-label="Desactivar filtro cercano"
            className="grid h-12 w-12 place-items-center rounded-full bg-forest-900 text-slate-200 shadow-lg ring-4 ring-forest-950 transition hover:bg-forest-800"
          >
            <Crosshair size={22} />
          </button>
        )}
      </div>

      {toast && (
        <div className="absolute top-4 left-4 z-[1000] max-w-[220px] rounded-xl bg-forest-900/90 px-3 py-2 text-xs text-slate-200 ring-1 ring-white/10 backdrop-blur">
          {toast}
        </div>
      )}

      <MapContainer
        ref={mapRef}
        center={userLoc ? [userLoc.lat, userLoc.lng] : [2.573, -72.646]}
        zoom={userLoc ? 12 : 13.5}
        scrollWheelZoom
        className="h-full w-full bg-forest-800"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <LocationController target={userLoc} />

        <MarkerClusterLayer sightings={filtered} openPost={openPost} />
      </MapContainer>
    </div>
  );
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
