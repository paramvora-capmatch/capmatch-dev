'use client';

import React from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, Clock, BarChart3, MapPin } from 'lucide-react';

// Fix for default markers in react-leaflet
import L from 'leaflet';
// @ts-expect-error Leaflet Default icon typings omit _getIconUrl property
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SupplyDemandMapProps {
  className?: string;
  compact?: boolean;
}

export default function SupplyDemandMap({ className = '', compact = false }: SupplyDemandMapProps) {
  // Mock supply data - 2300 Hickory St, Dallas, TX 75215
  const siteCenter = [32.7800, -96.7900]; // Dallas coordinates
  
  const supplyData = [
    // Current Supply
    {
      position: [32.7806, -96.7906],
      name: 'The Modern',
      type: 'current',
      units: 145,
      yearBuilt: 2023,
      occupancy: '94.2%',
      rentPSF: 4.25,
      color: '#3b82f6',
      icon: Building2
    },
    {
      position: [32.7795, -96.7895],
      name: 'Park Place Tower',
      type: 'current',
      units: 200,
      yearBuilt: 2022,
      occupancy: '96.8%',
      rentPSF: 4.10,
      color: '#3b82f6',
      icon: Building2
    },
    {
      position: [32.7810, -96.7885],
      name: 'Urban Living',
      type: 'current',
      units: 175,
      yearBuilt: 2024,
      occupancy: '89.5%',
      rentPSF: 4.35,
      color: '#3b82f6',
      icon: Building2
    },
    
    // Under Construction
    {
      position: [32.7785, -96.7915],
      name: 'Metro Heights',
      type: 'underConstruction',
      units: 160,
      completion: 'Q3 2025',
      progress: '65%',
      rentPSF: 4.50,
      color: '#f97316',
      icon: Clock
    },
    {
      position: [32.7805, -96.7875],
      name: 'City View',
      type: 'underConstruction',
      units: 180,
      completion: 'Q4 2025',
      progress: '45%',
      rentPSF: 4.30,
      color: '#f97316',
      icon: Clock
    },
    
    // Planned
    {
      position: [32.7775, -96.7895],
      name: 'Riverside Gardens',
      type: 'planned',
      units: 220,
      startDate: 'Q1 2026',
      rentPSF: 4.60,
      color: '#8b5cf6',
      icon: BarChart3
    },
    {
      position: [32.7815, -96.7906],
      name: 'Skyline Tower',
      type: 'planned',
      units: 300,
      startDate: 'Q2 2026',
      rentPSF: 4.80,
      color: '#8b5cf6',
      icon: BarChart3
    }
  ];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'current': return 'Current Supply';
      case 'underConstruction': return 'Under Construction';
      case 'planned': return 'Planned';
      default: return 'Unknown';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'current': return 'bg-blue-100 text-blue-800';
      case 'underConstruction': return 'bg-red-100 text-red-800';
      case 'planned': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const height = compact ? 'h-48' : 'h-96';
  const zoom = compact ? 15 : 14;

  return (
    <div className={`w-full ${height} rounded-lg overflow-hidden ${className}`}>
      <MapContainer
        center={siteCenter as [number, number]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Supply Properties */}
        {supplyData.map((property, index) => {
          const IconComponent = property.icon;
          return (
            <Circle
              key={`supply-${index}`}
              center={property.position as [number, number]}
              radius={150}
              pathOptions={{
                color: property.color,
                fillColor: property.color,
                fillOpacity: 0.4,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-center min-w-[250px]">
                  <div className="flex items-center justify-center mb-3">
                    <IconComponent className="h-5 w-5 mr-2 text-gray-600" />
                    <h3 className="font-semibold text-gray-800">{property.name}</h3>
                  </div>
                  
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${getTypeColor(property.type)}`}>
                    {getTypeLabel(property.type)}
                  </div>
                  
                  <div className="space-y-2 text-sm text-left">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Units:</span>
                      <span className="font-medium">{property.units.toLocaleString()}</span>
                    </div>
                    
                    {property.type === 'current' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Year Built:</span>
                          <span className="font-medium">{property.yearBuilt}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Occupancy:</span>
                          <span className="font-medium">{property.occupancy}</span>
                        </div>
                      </>
                    )}
                    
                    {property.type === 'underConstruction' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Completion:</span>
                          <span className="font-medium">{property.completion}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Progress:</span>
                          <span className="font-medium">{property.progress}</span>
                        </div>
                      </>
                    )}
                    
                    {property.type === 'planned' && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start Date:</span>
                        <span className="font-medium">{property.startDate}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. Rent/PSF:</span>
                      <span className="font-medium">${property.rentPSF}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Circle>
          );
        })}
        
        {/* Project Site Marker */}
        <Circle
          center={siteCenter as [number, number]}
          radius={100}
          pathOptions={{
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.8,
            weight: 3,
          }}
        >
          <Popup>
            <div className="text-center">
              <MapPin className="h-5 w-5 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold text-gray-800">SoGood Apartments</h3>
              <p className="text-sm text-gray-600">Our Project</p>
              <p className="text-sm text-gray-600">116 Units • 6 Stories</p>
              <p className="text-sm text-gray-600">Est. Completion: Q3 2027</p>
            </div>
          </Popup>
        </Circle>
        
        {/* Market Analysis Overlay */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
          <h4 className="font-semibold text-gray-800 text-sm mb-2">Market Summary</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Current Supply:</span>
              <span className="font-medium">520 units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Under Construction:</span>
              <span className="font-medium">340 units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Planned:</span>
              <span className="font-medium">520 units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Pipeline:</span>
              <span className="font-medium">1,380 units</span>
            </div>
          </div>
        </div>
      </MapContainer>
    </div>
  );
} 