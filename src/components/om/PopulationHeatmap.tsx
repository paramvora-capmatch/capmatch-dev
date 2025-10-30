'use client';

import React from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Users, TrendingUp, MapPin } from 'lucide-react';

// Fix for default markers in react-leaflet
import L from 'leaflet';
// @ts-expect-error Leaflet Default icon prototype lacks _getIconUrl in types
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface PopulationHeatmapProps {
  className?: string;
  compact?: boolean;
}

export default function PopulationHeatmap({ className = '', compact = false }: PopulationHeatmapProps) {
  // Mock population data for different radius areas
  const siteCenter = [37.7749, -122.4194]; // San Francisco coordinates
  
  const populationData = [
    {
      radius: 1,
      population: 12500,
      medianIncome: 85000,
      growth: 12.5,
      density: 'high',
      color: '#ef4444', // red
      label: '1 Mile Radius'
    },
    {
      radius: 3,
      population: 45000,
      medianIncome: 72000,
      growth: 8.2,
      density: 'medium',
      color: '#f97316', // orange
      label: '3 Mile Radius'
    },
    {
      radius: 5,
      population: 125000,
      medianIncome: 68000,
      growth: 5.8,
      density: 'medium-low',
      color: '#eab308', // yellow
      label: '5 Mile Radius'
    }
  ];

  const getDensityColor = (density: string) => {
    switch (density) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'medium-low': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const height = compact ? 'h-48' : 'h-96';

  return (
    <div className={`w-full ${height} rounded-lg overflow-hidden ${className}`}>
      <MapContainer
        center={siteCenter as [number, number]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Population Density Circles */}
        {populationData.map((data, index) => (
          <Circle
            key={`population-${index}`}
            center={siteCenter as [number, number]}
            radius={data.radius * 1609.34} // Convert miles to meters
            pathOptions={{
              color: data.color,
              fillColor: data.color,
              fillOpacity: 0.2,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-center min-w-[200px]">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 mr-2 text-gray-600" />
                  <h3 className="font-semibold text-gray-800">{data.label}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Population:</span>
                    <span className="font-medium">{data.population.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Median Income:</span>
                    <span className="font-medium">${data.medianIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Growth Rate:</span>
                    <span className="font-medium text-green-600">+{data.growth}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Density:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDensityColor(data.density)}`}>
                      {data.density.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}
        
        {/* Project Site Marker */}
        <Circle
          center={siteCenter as [number, number]}
          radius={100} // 100 meter radius for project site
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.8,
            weight: 3,
          }}
        >
          <Popup>
            <div className="text-center">
              <MapPin className="h-5 w-5 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Project Site</h3>
              <p className="text-sm text-gray-600">Downtown Highrise</p>
              <p className="text-sm text-gray-600">120 Units • 8 Stories</p>
            </div>
          </Popup>
        </Circle>
        
        {/* Additional Demographic Points */}
        {[
          { pos: [37.7755, -122.4200], label: 'High-Income Area', income: '$120K+', density: 'high' },
          { pos: [37.7735, -122.4180], label: 'Mixed-Income Area', income: '$75K', density: 'medium' },
          { pos: [37.7760, -122.4170], label: 'Student Area', income: '$45K', density: 'high' },
          { pos: [37.7720, -122.4210], label: 'Family Area', income: '$85K', density: 'medium' },
        ].map((point, index) => (
          <Circle
            key={`demographic-${index}`}
            center={point.pos as [number, number]}
            radius={200}
            pathOptions={{
              color: '#8b5cf6',
              fillColor: '#8b5cf6',
              fillOpacity: 0.3,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-center">
                <TrendingUp className="h-4 w-4 mx-auto mb-2 text-purple-600" />
                <h3 className="font-semibold text-gray-800">{point.label}</h3>
                <p className="text-sm text-gray-600">Median Income: {point.income}</p>
                <p className="text-sm text-gray-600">Density: {point.density}</p>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
} 