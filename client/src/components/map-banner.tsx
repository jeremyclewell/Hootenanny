import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as LType from "leaflet";

interface MapBannerProps {
  location: string;
}

const geocodeCache = new Map<string, [number, number] | null>();

async function geocode(query: string): Promise<[number, number] | null> {
  if (geocodeCache.has(query)) return geocodeCache.get(query)!;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      geocodeCache.set(query, null);
      return null;
    }
    const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    geocodeCache.set(query, coords);
    return coords;
  } catch {
    geocodeCache.set(query, null);
    return null;
  }
}

export default function MapBanner({ location }: MapBannerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!location) { setShow(false); return; }
    let cancelled = false;

    (async () => {
      const coords = await geocode(location);
      if (cancelled) return;

      if (!coords) { setShow(false); return; }
      if (!mapContainerRef.current) return;

      // Dynamically import Leaflet to ensure CSS is loaded first
      const L = (await import("leaflet")).default;

      if (cancelled) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

      const map = L.map(mapContainerRef.current!, {
        center: coords,
        zoom: 14,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
        zoomControl: false,
        attributionControl: false,
      });

      // CartoDB Voyager tiles — warm beige land, sand roads, muted teal water
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { maxZoom: 20, subdomains: "abcd" }
      ).addTo(map);

      // Subtle terracotta dot marker at the location
      const dot = L.divIcon({
        html: `<div style="
          width:14px; height:14px;
          background: hsl(14, 56%, 51%);
          border: 2.5px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        "></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker(coords, { icon: dot }).addTo(map);

      mapRef.current = map;

      // Invalidate after a tick so Leaflet measures the container correctly
      setTimeout(() => {
        if (!cancelled && mapRef.current) {
          mapRef.current.invalidateSize();
          setReady(true);
        }
      }, 200);
    })();

    return () => { cancelled = true; };
  }, [location]);

  useEffect(() => {
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  if (!show) return null;

  // Cream value from CSS variable — hard-coded to match --background: hsl(52, 65%, 93%)
  const cream = "hsl(52, 65%, 93%)";

  return (
    <div
      className="relative w-full overflow-hidden pointer-events-none select-none"
      style={{ height: "260px" }}
      aria-hidden="true"
    >
      {/* ── Perspective wrapper: creates the receding-into-distance look ── */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "520px",
          top: "-40px",
          transformOrigin: "top center",
          transform: "perspective(650px) rotateX(32deg) scaleX(1.08)",
        }}
      >
        {/* Map element — warm CSS filter pulls tiles toward our palette */}
        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            height: "100%",
            filter:
              "sepia(0.30) saturate(0.75) brightness(1.07) hue-rotate(6deg)",
            opacity: ready ? 1 : 0,
            transition: "opacity 0.9s ease",
          }}
        />
      </div>

      {/* Loading shimmer */}
      {!ready && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: `linear-gradient(120deg, hsl(35,50%,88%) 0%, hsl(52,60%,90%) 50%, hsl(35,50%,88%) 100%)`,
          }}
        />
      )}

      {/* Side vignettes — blend edges into cream */}
      <div
        className="absolute inset-y-0 left-0 pointer-events-none"
        style={{
          width: "14%",
          background: `linear-gradient(to right, ${cream}, transparent)`,
        }}
      />
      <div
        className="absolute inset-y-0 right-0 pointer-events-none"
        style={{
          width: "14%",
          background: `linear-gradient(to left, ${cream}, transparent)`,
        }}
      />

      {/* Top vignette — subtle dark wash at the very top */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "48px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.06), transparent)",
        }}
      />

      {/* Bottom fade — smooth dissolve into the cream page background */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: "170px",
          background: `linear-gradient(to bottom, transparent 0%, ${cream} 100%)`,
        }}
      />
    </div>
  );
}
