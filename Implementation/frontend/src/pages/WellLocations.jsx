import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/WellLocations.css";

// Fix default marker icon in Vite/bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const DEFAULT_CENTER = [9.082, 8.6753]; // Nigeria
const DEFAULT_ZOOM = 5;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const GEOCODE_DELAY_MS = 1100; // Nominatim rate limit: 1 req/sec

export default function WellLocations() {
  const [wells, setWells] = useState([]);
  const [wellsWithCoords, setWellsWithCoords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function geocode(q) {
      if (!q || !String(q).trim()) return null;
      try {
        const res = await fetch(
          `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(q)}&limit=1`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        if (cancelled || !Array.isArray(data) || data.length === 0) return null;
        const { lat, lon } = data[0];
        return { lat: parseFloat(lat), lng: parseFloat(lon) };
      } catch {
        return null;
      }
    }

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/wells/");
        if (!res.ok) throw new Error(`Failed to load wells: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setWells(list);

        const withCoords = [];
        for (const w of list) {
          const locationQuery = w.location || w.well_name || w.well_id;
          const coords = await geocode(locationQuery);
          if (cancelled) return;
          if (coords) {
            withCoords.push({
              ...w,
              lat: coords.lat,
              lng: coords.lng,
            });
          }
          await new Promise((r) => setTimeout(r, GEOCODE_DELAY_MS));
        }
        if (!cancelled) setWellsWithCoords(withCoords);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load well locations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Create map when container is ready; update markers when wellsWithCoords changes
  useEffect(() => {
    if (!mapRef.current) return;

    let map = mapInstanceRef.current;
    if (!map) {
      map = L.map(mapRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
    }

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    if (wellsWithCoords.length > 0) {
      const bounds = [];
      wellsWithCoords.forEach((w) => {
        const marker = L.marker([w.lat, w.lng]).addTo(map);
        const popupContent = `
          <strong>${w.well_name || w.well_id}</strong><br/>
          ${w.location ? `Location: ${w.location}<br/>` : ""}
          <a href="/wells/${w.well_id}">View dashboard</a>
        `;
        marker.bindPopup(popupContent);
        bounds.push([w.lat, w.lng]);
      });
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [wellsWithCoords]);

  // Destroy map on unmount only
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (loading) return <div className="wellLocations"><div className="wellLocationsLoading">Loading well locations…</div></div>;
  if (error) return <div className="wellLocations"><div className="wellLocationsError">{error}</div></div>;

  return (
    <div className="wellLocations">
      <div className="wellLocationsHeader">
        <h1 className="wellLocationsTitle">Well Location</h1>
        <p className="wellLocationsSub">Map overview of well locations. Wells are placed by geocoding their location or name.</p>
      </div>

      <div className="wellLocationsContent">
        <div className="wellLocationsMapWrap">
          <div
            ref={mapRef}
            className="wellLocationsMap"
            aria-label="Map of well locations"
          />
        </div>

        <aside className="wellLocationsList">
          <h3>Wells on map ({wellsWithCoords.length})</h3>
          <ul>
            {wellsWithCoords.map((w) => (
              <li key={w.well_id}>
                <Link to={`/wells/${w.well_id}`}>{w.well_name || w.well_id}</Link>
                {w.location && <span className="wellLocationsListLocation">{w.location}</span>}
              </li>
            ))}
          </ul>
          {wells.length > wellsWithCoords.length && (
            <div className="wellLocationsListOther">
              <h4>Not on map (no coordinates)</h4>
              <ul>
                {wells
                  .filter((w) => !wellsWithCoords.some((c) => c.well_id === w.well_id))
                  .map((w) => (
                    <li key={w.well_id}>
                      <Link to={`/wells/${w.well_id}`}>{w.well_name || w.well_id}</Link>
                      {w.location && <span> — {w.location}</span>}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
