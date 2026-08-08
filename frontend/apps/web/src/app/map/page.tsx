'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';
const WS_BASE = API.replace('/v1', '');

interface VehiclePosition {
  vehicleId: string;
  routeId?: string | null;
  lat: number;
  lng: number;
  heading?: number | null;
  speedKmh?: number | null;
  occupancy?: string | null;
  updatedAt?: string;
}

interface BusStop {
  id: string;
  name: string;
  nameSi?: string | null;
  name_si?: string | null;
  lat: number;
  lng: number;
}

// Kandy path: Gampola → Kandy City Centre (21 stops)
const DEMO_PATH: [number, number][] = [
  [7.1634, 80.5742], // Gampola
  [7.1720, 80.5830],
  [7.1850, 80.5950],
  [7.1970, 80.6010],
  [7.2100, 80.6090],
  [7.2200, 80.6170],
  [7.2300, 80.6220],
  [7.2410, 80.6270], // Hindagala
  [7.2500, 80.6290], // Tennekumbura
  [7.2560, 80.6300],
  [7.2620, 80.6310], // Peradeniya Jn
  [7.2680, 80.6320],
  [7.2730, 80.6330],
  [7.2800, 80.6340],
  [7.2860, 80.6345],
  [7.2890, 80.6347],
  [7.2906, 80.6337], // Kandy Clock Tower
  [7.2920, 80.6341],
  [7.2931, 80.6353], // Railway Station
  [7.2934, 80.6348],
  [7.2936, 80.6350], // Kandy City Centre
];

export default function MapPage() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markersRef = useRef<Map<string, import('leaflet').Marker>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoStepRef = useRef(0);

  const [wsStatus, setWsStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const [vehicleCount, setVehicleCount] = useState(0);
  const [simRunning, setSimRunning] = useState(false);

  const updateMarker = useCallback((map: import('leaflet').Map, L: typeof import('leaflet'), pos: VehiclePosition) => {
    const rotation = pos.heading ?? 0;
    const occupancyColor = pos.occupancy === 'FULL' ? '#DC2626'
      : pos.occupancy === 'HIGH' ? '#EA580C'
      : pos.occupancy === 'MEDIUM' ? '#CA8A04'
      : '#16A34A';

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          position:relative;width:36px;height:36px;
          transform:rotate(${rotation}deg);
          filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));
        ">
          <div style="
            width:36px;height:36px;border-radius:50%;
            background:${occupancyColor};
            border:3px solid white;
            display:flex;align-items:center;justify-content:center;
            font-size:18px;line-height:1;
          ">🚌</div>
        </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
    });

    const existing = markersRef.current.get(pos.vehicleId);
    const popupHtml = `
      <div style="min-width:140px">
        <div style="font-weight:700;margin-bottom:4px">Bus ${pos.vehicleId}</div>
        ${pos.routeId ? `<div style="font-size:11px;color:#6B7280">Route: ${pos.routeId}</div>` : ''}
        ${pos.speedKmh != null ? `<div style="font-size:11px">Speed: ${Math.round(pos.speedKmh)} km/h</div>` : ''}
        ${pos.occupancy ? `<div style="font-size:11px">Occupancy: ${pos.occupancy}</div>` : ''}
        ${pos.updatedAt ? `<div style="font-size:10px;color:#9CA3AF;margin-top:4px">${new Date(pos.updatedAt).toLocaleTimeString()}</div>` : ''}
      </div>`;

    if (existing) {
      existing.setLatLng([pos.lat, pos.lng]);
      existing.setIcon(icon);
      existing.getPopup()?.setContent(popupHtml);
    } else {
      const m = L.marker([pos.lat, pos.lng], { icon }).addTo(map).bindPopup(popupHtml);
      markersRef.current.set(pos.vehicleId, m);
    }

    setVehicleCount(markersRef.current.size);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const L = await import('leaflet');
      if (cancelled || !mapDivRef.current || mapRef.current) return;

      // Fix default icon paths broken by webpack
      // @ts-expect-error _getIconUrl is internal
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapDivRef.current, { center: [7.2750, 80.6200], zoom: 13 });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Load bus stops
      try {
        const res = await fetch(`${API}/search/stops/nearby?lat=7.2750&lng=80.6200&radiusMeters=25000&perPage=50`);
        const data = await res.json() as BusStop[] | { stops: BusStop[] };
        const stops = Array.isArray(data) ? data : data.stops ?? [];

        const stopIcon = L.divIcon({
          className: '',
          html: '<div style="width:10px;height:10px;border-radius:50%;background:#2563EB;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
          popupAnchor: [0, -8],
        });

        for (const s of stops) {
          const name = s.name;
          const si = s.nameSi ?? s.name_si;
          L.marker([s.lat, s.lng], { icon: stopIcon })
            .addTo(map)
            .bindPopup(`<strong>${name}</strong>${si ? `<br><span style="font-size:11px;color:#6B7280">${si}</span>` : ''}`);
        }
      } catch { /* backend may not be ready */ }

      // WebSocket
      const socket = io(`${WS_BASE}/v1/ws/tracking`, { transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (!cancelled) setWsStatus('live');
        socket.emit('SUBSCRIBE_ALL');
      });
      socket.on('disconnect', () => { if (!cancelled) setWsStatus('offline'); });
      socket.on('connect_error', () => { if (!cancelled) setWsStatus('offline'); });

      socket.on('VEHICLE_POSITION', (data: VehiclePosition) => {
        if (!cancelled && mapRef.current) updateMarker(mapRef.current, L, data);
      });
    }

    void init();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [updateMarker]);

  const startDemo = useCallback(() => {
    if (simRunning) {
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
      setSimRunning(false);
      return;
    }

    demoStepRef.current = 0;
    setSimRunning(true);

    const tick = async () => {
      const step = demoStepRef.current;
      if (step >= DEMO_PATH.length) {
        demoStepRef.current = 0; // loop
        return;
      }
      const [lat, lng] = DEMO_PATH[step];
      const next = DEMO_PATH[step + 1];
      let heading: number | undefined;
      if (next) {
        const dLat = next[0] - lat;
        const dLng = next[1] - lng;
        heading = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI);
        if (heading < 0) heading += 360;
      }

      try {
        await fetch(`${API}/tracking/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicleId: 'BUS-001',
            routeId: 'route-594-kandy',
            lat,
            lng,
            heading,
            speedKmh: 35 + Math.random() * 20,
            occupancy: ['LOW', 'MEDIUM', 'HIGH'][step % 3],
          }),
        });
      } catch { /* ignore */ }

      demoStepRef.current = step + 1;
    };

    void tick();
    demoTimerRef.current = setInterval(() => void tick(), 1500);
  }, [simRunning]);

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-primary-700 px-4 pt-10 pb-3 text-white flex-shrink-0 flex items-center justify-between">
        <div>
          <Link href="/" className="text-primary-200 text-sm flex items-center gap-1 mb-1">
            ← Back
          </Link>
          <h1 className="text-lg font-bold leading-tight">Live Bus Map</h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            wsStatus === 'live' ? 'bg-green-400 animate-pulse' :
            wsStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
          }`} />
          <span className="text-primary-200">
            {wsStatus === 'live' ? `Live · ${vehicleCount} bus${vehicleCount !== 1 ? 'es' : ''}` :
             wsStatus === 'offline' ? 'Offline' : 'Connecting…'}
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapDivRef} className="absolute inset-0" />

        {/* Legend */}
        <div className="absolute bottom-20 left-3 z-[1000] bg-white rounded-xl shadow-lg px-3 py-2 text-xs space-y-1.5">
          <p className="font-semibold text-gray-700 mb-1">Occupancy</p>
          {[['LOW', '#16A34A'], ['MEDIUM', '#CA8A04'], ['HIGH', '#EA580C'], ['FULL', '#DC2626']].map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span style={{ background: color }} className="w-3 h-3 rounded-full inline-block" />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
          <hr className="my-1 border-gray-100" />
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white inline-block" />
            <span className="text-gray-600">Bus Stop</span>
          </div>
        </div>

        {/* Simulate button */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
          <button
            onClick={startDemo}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-colors ${
              simRunning
                ? 'bg-red-500 text-white'
                : 'bg-primary-600 text-white'
            }`}
          >
            {simRunning ? '■ Stop Simulation' : '▶ Simulate Bus (Gampola → Kandy)'}
          </button>
        </div>
      </div>
    </div>
  );
}
