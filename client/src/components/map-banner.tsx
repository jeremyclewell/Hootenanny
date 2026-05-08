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

      const primary = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim() || "hsl(14, 56%, 51%)";
      const dot = L.divIcon({
        html: `<div style="
          width:18px; height:18px;
          background: ${primary};
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
    /*
      Outer fixed frame.
      KEY: `perspective` as a CSS property (not inside transform:) so that
      `perspectiveOrigin` can be set independently.
      perspectiveOrigin: top-center puts the vanishing point at the top of the
      screen — this means the top of the map appears at normal scale (eye is
      right there) and the bottom fans out toward the viewer (~150% apparent
      width), producing the "looking down at a map" aerial effect.
    */
    <div
      className="fixed inset-0 pointer-events-none select-none overflow-hidden"
      style={{
        zIndex: 0,
        perspective: "800px",
        perspectiveOrigin: "50% 0%",
      }}
      aria-hidden="true"
    >
      {/*
        Inner perspective wrapper.
        rotateX(+20deg): per MDN, positive values tilt the top away from the
        viewer (into the screen) and bring the bottom toward the viewer.
        With the vanishing point at the top (perspectiveOrigin above), the top
        appears at 100% scale and the bottom appears expanded (~140-150%).
        Width 100% + height 100% is enough because the perspective projection
        keeps visible content within the clipping box.
      */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          transformOrigin: "top center",
          transform: "rotateX(20deg)",
        }}
      >
        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            height: "100%",
            filter: "sepia(0.08) saturate(1.25) contrast(1.25) brightness(1.0)",
            opacity: ready ? 1 : 0,
            transition: "opacity 1.0s ease",
          }}
        />
      </div>

      {/* Loading shimmer */}
      {!ready && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-sand-200 via-muted to-sand-200"
        />
      )}

      {/* Thin cream veil — softens without washing out */}
      <div className="absolute inset-0 bg-background opacity-[0.18]" />
    </div>
  );
}
