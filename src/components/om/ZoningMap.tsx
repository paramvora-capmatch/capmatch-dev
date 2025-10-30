"use client";

import React from "react";
import { MapContainer, TileLayer, Polygon, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

// Fix for default markers in react-leaflet
import L from "leaflet";
// @ts-expect-error Leaflet's type defs hide _getIconUrl on Default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface ZoningMapProps {
  className?: string;
  compact?: boolean;
}

export default function ZoningMap({
  className = "",
  compact = false,
}: ZoningMapProps) {
  // Mock zoning data
  const siteCenter = [37.7749, -122.4194];
  const siteBoundary = [
    [37.7749, -122.4194],
    [37.7749, -122.4189],
    [37.7745, -122.4189],
    [37.7745, -122.4194],
  ];

  const zoningAreas = [
    {
      name: "MU-4 (Mixed Use)",
      boundary: [
        [37.7752, -122.4197],
        [37.7752, -122.4186],
        [37.7742, -122.4186],
        [37.7742, -122.4197],
      ],
      color: "#3b82f6",
      description: "Mixed Use - 4 Stories Max",
      far: "4.0",
      height: "100 ft",
      setbacks: "15 ft front, 10 ft side/rear",
    },
    {
      name: "R-3 (Residential)",
      boundary: [
        [37.7755, -122.42],
        [37.7755, -122.4197],
        [37.7749, -122.4197],
        [37.7749, -122.42],
      ],
      color: "#10b981",
      description: "Residential - 3 Stories Max",
      far: "2.5",
      height: "75 ft",
      setbacks: "20 ft front, 15 ft side/rear",
    },
    {
      name: "C-2 (Commercial)",
      boundary: [
        [37.7749, -122.4186],
        [37.7749, -122.418],
        [37.7742, -122.418],
        [37.7742, -122.4186],
      ],
      color: "#f59e0b",
      description: "Commercial - 2 Stories Max",
      far: "1.5",
      height: "50 ft",
      setbacks: "25 ft front, 20 ft side/rear",
    },
  ];

  const height = compact ? "h-48" : "h-64";

  return (
    <div className={`w-full ${height} rounded-lg overflow-hidden ${className}`}>
      <MapContainer
        center={siteCenter as [number, number]}
        zoom={17}
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg"
        zoomControl={!compact}
        scrollWheelZoom={!compact}
        dragging={!compact}
        touchZoom={!compact}
        doubleClickZoom={!compact}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Zoning Areas */}
        {zoningAreas.map((zone, index) => (
          <Polygon
            key={`zone-${index}`}
            positions={zone.boundary as [number, number][]}
            pathOptions={{
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: 0.3,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-center min-w-[200px]">
                <h3 className="font-semibold text-gray-800 mb-2">
                  {zone.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{zone.description}</p>
                <div className="space-y-1 text-xs text-left">
                  <div className="flex justify-between">
                    <span className="text-gray-600">FAR:</span>
                    <span className="font-medium">{zone.far}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Height:</span>
                    <span className="font-medium">{zone.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Setbacks:</span>
                    <span className="font-medium text-xs">{zone.setbacks}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* Site Boundary */}
        <Polygon
          positions={siteBoundary as [number, number][]}
          pathOptions={{
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.6,
            weight: 3,
          }}
        >
          <Popup>
            <div className="text-center">
              <MapPin className="h-5 w-5 mx-auto mb-2 text-red-600" />
              <h3 className="font-semibold text-gray-800">Project Site</h3>
              <p className="text-sm text-gray-600">2.5 Acres</p>
              <p className="text-sm text-gray-600">Zoning: MU-4</p>
              <p className="text-sm text-gray-600">FAR: 3.5/4.0</p>
              <p className="text-sm text-gray-600">Height: 85&apos;/100&apos;</p>
            </div>
          </Popup>
        </Polygon>

        {/* Zoning Legend */}
        {!compact && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
            <h4 className="font-semibold text-gray-800 text-sm mb-2">
              Zoning Legend
            </h4>
            <div className="space-y-2 text-xs">
              {zoningAreas.map((zone, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded mr-2"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="text-gray-700">{zone.name}</span>
                </div>
              ))}
              <div className="flex items-center">
                <div className="w-3 h-3 rounded mr-2 bg-red-500" />
                <span className="text-gray-700">Project Site</span>
              </div>
            </div>
          </div>
        )}

        {/* Zoning Summary */}
        {compact && (
          <div className="absolute bottom-2 left-2 right-2 bg-white rounded-lg shadow-lg p-2 z-[1000]">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">Zoning:</span>
                <span className="font-medium ml-1">MU-4</span>
              </div>
              <div>
                <span className="text-gray-600">FAR:</span>
                <span className="font-medium ml-1">3.5/4.0</span>
              </div>
              <div>
                <span className="text-gray-600">Height:</span>
                <span className="font-medium ml-1">85&apos;/100&apos;</span>
              </div>
              <div>
                <span className="text-gray-600">Lot Size:</span>
                <span className="font-medium ml-1">2.5 Acres</span>
              </div>
            </div>
          </div>
        )}
      </MapContainer>
    </div>
  );
}
