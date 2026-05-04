import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as LType from "leaflet";

interface MapBackgroundProps {
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

export default function MapBackground({ location }: MapBackgroundProps) {
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

      const L = (await import("leaflet")).default;

      if (cancelled) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

      const map = L.map(mapContainerRef.current!, {
        center: coords,
        zoom: 15,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { maxZoom: 20, subdomains: "abcd" }
      ).addTo(map);

      const dot = L.divIcon({
        html: `<div style="
          width:18px; height:18px;
          background: hsl(14, 56%, 51%);
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 10px rgba(0,0,0,0.40);
        "></div>`,
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker(coords, { icon: dot }).addTo(map);

      mapRef.current = map;

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

  return (
    /* Outer fixed frame — clips the perspective overflow */
    <div
      className="fixed inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/*
        Perspective wrapper:
        - rotateX(-20deg) with transform-origin at top means the top edge
          stays at 100% viewport width while the bottom swings toward the
          viewer, expanding to ~150% — giving the "looking down at the map"
          aerial-perspective feel.
        - 130% width + negative left centres it so corners fill even when
          the bottom fans out beyond the viewport edges.
        - 130% height ensures the bottom of the map still covers the
          viewport after the angular compression.
      */}
      <div
        style={{
          position: "absolute",
          width: "130%",
          height: "130%",
          top: 0,
          left: "-15%",
          transformOrigin: "top center",
          transform: "perspective(700px) rotateX(-20deg)",
        }}
      >
        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            height: "100%",
            /* More vivid: less sepia wash, boosted saturation + contrast */
            filter: "sepia(0.08) saturate(1.25) contrast(1.25) brightness(1.0)",
            opacity: ready ? 1 : 0,
            transition: "opacity 1.0s ease",
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

      {/* Thin cream veil — just enough to soften without washing out */}
      <div
        className="absolute inset-0"
        style={{ background: "hsla(52, 65%, 93%, 0.18)" }}
      />
    </div>
  );
}
