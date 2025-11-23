'use client';

import React from 'react';
import { MapContainer, TileLayer, Polygon, Circle, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, Car, TreePine } from 'lucide-react';

// Fix for default markers in react-leaflet
import L from 'leaflet';
// @ts-expect-error Leaflet types do not expose _getIconUrl on Default
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface InteractiveSiteMapProps {
  className?: string;
}

export default function InteractiveSiteMap({ className = '' }: InteractiveSiteMapProps) {
  // Mock site data - 2300 Hickory St, Dallas, TX 75215
  const siteCenter = [32.7800, -96.7900]; // Dallas coordinates
  const buildingFootprint = [
    [32.7800, -96.7900],
    [32.7800, -96.7895],
    [32.7796, -96.7895],
    [32.7796, -96.7900],
  ];
  
  const parkingAreas = [
    { center: [32.7798, -96.7902], radius: 0.001, label: 'Surface Parking' },
    { center: [32.7798, -96.7893], radius: 0.001, label: 'Garage Parking' },
  ];
  
  const greenSpaces = [
    { center: [32.7802, -96.7898], radius: 0.0008, label: 'Central Plaza' },
    { center: [32.7794, -96.7898], radius: 0.0006, label: 'Garden Area' },
  ];
  
  const amenities = [
    { position: [32.7801, -96.7896], label: 'Main Entrance', icon: '🏢' },
    { position: [32.7799, -96.7904], label: 'Parking Entrance', icon: '🚗' },
    { position: [32.7793, -96.7896], label: 'Garden Path', icon: '🌳' },
  ];

  return (
    <div className={`w-full h-96 rounded-lg overflow-hidden ${className}`}>
      <MapContainer
        center={siteCenter as [number, number]}
        zoom={18}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Building Footprint */}
        <Polygon
          positions={buildingFootprint as [number, number][]}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.6,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-center">
              <Building2 className="h-5 w-5 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Building Footprint</h3>
              <p className="text-sm text-gray-600">6 Stories • 116 Units</p>
              <p className="text-sm text-gray-600">FAR: 3.5/4.0 • Height: 85&apos;/100&apos;</p>
            </div>
          </Popup>
        </Polygon>
        
        {/* Parking Areas */}
        {parkingAreas.map((area, index) => (
          <Circle
            key={`parking-${index}`}
            center={area.center as [number, number]}
            radius={area.radius * 111000} // Convert to meters
            pathOptions={{
              color: '#8b5cf6',
              fillColor: '#8b5cf6',
              fillOpacity: 0.4,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-center">
                <Car className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold text-gray-800">{area.label}</h3>
                <p className="text-sm text-gray-600">108 Parking Spaces</p>
                <p className="text-sm text-gray-600">Ratio: 1.2 per unit</p>
              </div>
            </Popup>
          </Circle>
        ))}
        
        {/* Green Spaces */}
        {greenSpaces.map((space, index) => (
          <Circle
            key={`green-${index}`}
            center={space.center as [number, number]}
            radius={space.radius * 111000}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.3,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-center">
                <TreePine className="h-5 w-5 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold text-gray-800">{space.label}</h3>
                <p className="text-sm text-gray-600">Landscaped Area</p>
                <p className="text-sm text-gray-600">Site Coverage: 25%</p>
              </div>
            </Popup>
          </Circle>
        ))}
        
        {/* Amenity Markers */}
        {amenities.map((amenity, index) => (
          <Marker
            key={`amenity-${index}`}
            position={amenity.position as [number, number]}
          >
            <Popup>
              <div className="text-center">
                <span className="text-2xl">{amenity.icon}</span>
                <h3 className="font-semibold text-gray-800">{amenity.label}</h3>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
} 