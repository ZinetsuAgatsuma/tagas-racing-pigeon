import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

interface MapPickerProps {
  mode: 'pick' | 'view' | 'routes';
  latitude?: number;
  longitude?: number;
  onChange?: (lat: number, lng: number) => void;
  title?: string;
  // For routes mode (GPS visualization of release point and participating lofts)
  releasePoint?: {
    name: string;
    latitude: number;
    longitude: number;
  };
  lofts?: Array<{
    name: string;
    ownerName: string;
    latitude: number;
    longitude: number;
    distance?: number; // in meters
  }>;
}

export default function MapPicker({
  mode,
  latitude = 14.5995, // Default Manila
  longitude = 120.9842,
  onChange,
  title = 'Selected Location',
  releasePoint,
  lofts = []
}: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({ lat: latitude, lng: longitude });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up old instance if it exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Set initial center
    let center: L.LatLngExpression = [latitude, longitude];
    let zoom = 12;

    if (mode === 'routes' && releasePoint) {
      center = [releasePoint.latitude, releasePoint.longitude];
      zoom = 8;
    }

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // Add Tile Layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Custom CSS icons to avoid broken relative image assets
    const loftIcon = L.divIcon({
      className: 'custom-loft-marker',
      html: `<div class="w-8 h-8 bg-emerald-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform"><span class="text-sm">🏠</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const releaseIcon = L.divIcon({
      className: 'custom-release-marker',
      html: `<div class="w-8 h-8 bg-red-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform"><span class="text-sm">🏁</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const selectedIcon = L.divIcon({
      className: 'custom-selected-marker',
      html: `<div class="w-8 h-8 bg-amber-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform"><span class="text-sm">📍</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (mode === 'pick') {
      // Create single draggable/clickable marker
      const marker = L.marker([latitude, longitude], {
        icon: selectedIcon,
        draggable: true
      }).addTo(map);

      marker.bindPopup(`<b>${title}</b><br/>Lat: ${latitude.toFixed(5)}<br/>Lng: ${longitude.toFixed(5)}`).openPopup();
      markerRef.current = marker;

      // When dragging marker
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setCurrentCoords({ lat: position.lat, lng: position.lng });
        if (onChange) onChange(position.lat, position.lng);
        marker.setPopupContent(`<b>${title}</b><br/>Lat: ${position.lat.toFixed(5)}<br/>Lng: ${position.lng.toFixed(5)}`).openPopup();
      });

      // When clicking anywhere on map
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCurrentCoords({ lat, lng });
        if (onChange) onChange(lat, lng);
        marker.setPopupContent(`<b>${title}</b><br/>Lat: ${lat.toFixed(5)}<br/>Lng: ${lng.toFixed(5)}`).openPopup();
        map.panTo([lat, lng]);
      });

    } else if (mode === 'view') {
      // Pure display mode
      const marker = L.marker([latitude, longitude], {
        icon: selectedIcon
      }).addTo(map);

      marker.bindPopup(`<b>${title}</b><br/>Lat: ${latitude.toFixed(5)}<br/>Lng: ${longitude.toFixed(5)}`).openPopup();
      markerRef.current = marker;
      map.setView([latitude, longitude], 13);

    } else if (mode === 'routes' && releasePoint) {
      // Routes mode: Release Point + Loft markers + Connecting lines (GPS visualization)
      const markers: L.Marker[] = [];
      const boundsArr: L.LatLngExpression[] = [];

      // 1. Release point marker
      const relMarker = L.marker([releasePoint.latitude, releasePoint.longitude], {
        icon: releaseIcon
      }).addTo(map);
      
      relMarker.bindPopup(`
        <div class="p-1">
          <h4 class="font-bold text-red-600 font-display">🏁 Release Point</h4>
          <p class="text-xs font-semibold mt-1">${releasePoint.name}</p>
          <p class="text-[10px] text-gray-500 mt-1">Lat: ${releasePoint.latitude.toFixed(5)}<br/>Lng: ${releasePoint.longitude.toFixed(5)}</p>
        </div>
      `);
      markers.push(relMarker);
      boundsArr.push([releasePoint.latitude, releasePoint.longitude]);

      // 2. Add participating loft markers and polylines
      lofts.forEach(loft => {
        const loftMarker = L.marker([loft.latitude, loft.longitude], {
          icon: loftIcon
        }).addTo(map);

        const distText = loft.distance 
          ? `<b>Distance:</b> ${(loft.distance / 1000).toFixed(2)} km (${loft.distance.toLocaleString()}m)` 
          : '';

        loftMarker.bindPopup(`
          <div class="p-1 min-w-[150px]">
            <h4 class="font-bold text-emerald-600 font-display">🏠 ${loft.name}</h4>
            <p class="text-xs text-gray-600 mt-0.5">Owner: ${loft.ownerName}</p>
            <p class="text-xs font-mono text-emerald-700 mt-1">${distText}</p>
            <p class="text-[10px] text-gray-400 mt-0.5">Coords: ${loft.latitude.toFixed(5)}, ${loft.longitude.toFixed(5)}</p>
          </div>
        `);
        markers.push(loftMarker);
        boundsArr.push([loft.latitude, loft.longitude]);

        // Draw dotted flight path connecting release point to loft
        const flightPath = L.polyline(
          [[releasePoint.latitude, releasePoint.longitude], [loft.latitude, loft.longitude]],
          {
            color: '#10b981',
            weight: 2,
            dashArray: '6, 8',
            opacity: 0.8
          }
        ).addTo(map);

        flightPath.bindPopup(`
          <div class="p-1">
            <p class="text-xs font-semibold">Flight Path</p>
            <p class="text-[11px] text-gray-500">From <b>${releasePoint.name}</b> to <b>${loft.name}</b></p>
            <p class="text-xs text-emerald-600 mt-1 font-mono font-bold">${distText}</p>
          </div>
        `);
      });

      // Fit map boundaries to contain all release point and lofts
      if (boundsArr.length > 0) {
        const bounds = L.latLngBounds(boundsArr);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }

    // Map Resize Handler
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mode, latitude, longitude, title, releasePoint, lofts]);

  return (
    <div className="relative w-full h-full min-h-[300px] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-inner">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      {mode === 'pick' && (
        <div className="absolute top-3 right-3 z-30 bg-white/95 backdrop-blur-sm shadow-md rounded-lg px-3 py-1.5 text-xs text-gray-600 border border-gray-200 pointer-events-none select-none font-medium">
          <span className="text-amber-500 mr-1">📍</span> Click map or drag marker to adjust
          <div className="font-mono text-[10px] text-gray-400 mt-0.5">
            {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
          </div>
        </div>
      )}
    </div>
  );
}
