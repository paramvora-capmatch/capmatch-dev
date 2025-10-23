'use client';

import React from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, Users, TrendingUp, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Fix for default markers in react-leaflet
import L from 'leaflet';
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface EmploymentMapProps {
  className?: string;
  compact?: boolean;
}

export default function EmploymentMap({ className = '', compact = false }: EmploymentMapProps) {
  // Mock employment data - in a real app this would come from props or API
  const siteCenter = [37.7749, -122.4194]; // San Francisco coordinates
  
  const employers = [
    {
      position: [37.7755, -122.4200],
      name: 'Tech Corp',
      employees: 15000,
      growth: '+12%',
      industry: 'Technology',
      distance: '1.2 miles',
      color: '#3b82f6',
      description: 'Leading software company specializing in enterprise solutions'
    },
    {
      position: [37.7740, -122.4180],
      name: 'Regional Medical Center',
      employees: 8500,
      growth: '+5%',
      industry: 'Healthcare',
      distance: '1.5 miles',
      color: '#10b981',
      description: 'Full-service medical center with 24/7 emergency care'
    },
    {
      position: [37.7760, -122.4170],
      name: 'Financial Services Inc',
      employees: 6200,
      growth: '+8%',
      industry: 'Finance',
      distance: '2.1 miles',
      color: '#f59e0b',
      description: 'Investment banking and wealth management services'
    },
    {
      position: [37.7735, -122.4210],
      name: 'State University',
      employees: 4800,
      growth: '+3%',
      industry: 'Education',
      distance: '2.8 miles',
      color: '#8b5cf6',
      description: 'Public research university with strong STEM programs'
    },
    {
      position: [37.7750, -122.4160],
      name: 'Aerospace Manufacturing',
      employees: 3200,
      growth: '+15%',
      industry: 'Manufacturing',
      distance: '3.2 miles',
      color: '#ef4444',
      description: 'Advanced aerospace components and systems'
    },
    {
      position: [37.7725, -122.4190],
      name: 'Retail Chain HQ',
      employees: 2800,
      growth: '+2%',
      industry: 'Retail',
      distance: '3.5 miles',
      color: '#06b6d4',
      description: 'National retail chain headquarters and distribution'
    },
    {
      position: [37.7765, -122.4200],
      name: 'Biotech Research',
      employees: 1800,
      growth: '+22%',
      industry: 'Biotechnology',
      distance: '0.8 miles',
      color: '#84cc16',
      description: 'Cutting-edge biotechnology research and development'
    }
  ];

  const getIndustryColor = (industry: string) => {
    const colors: { [key: string]: string } = {
      'Technology': 'bg-blue-100 text-blue-800',
      'Healthcare': 'bg-green-100 text-green-800',
      'Finance': 'bg-yellow-100 text-yellow-800',
      'Education': 'bg-purple-100 text-purple-800',
      'Manufacturing': 'bg-red-100 text-red-800',
      'Retail': 'bg-cyan-100 text-cyan-800',
      'Biotechnology': 'bg-lime-100 text-lime-800'
    };
    return colors[industry] || 'bg-gray-100 text-gray-800';
  };

  const totalEmployees = employers.reduce((sum, employer) => sum + employer.employees, 0);
  const avgGrowth = employers.reduce((sum, employer) => sum + parseInt(employer.growth.replace(/[^\d-]/g, '')), 0) / employers.length;

  const height = compact ? 'h-48' : 'h-96';
  const zoom = compact ? 14 : 13;

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
        
        {/* Employment Density Circles */}
        {employers.map((employer, index) => (
          <Circle
            key={`employer-${index}`}
            center={employer.position as [number, number]}
            radius={Math.sqrt(employer.employees) * 2} // Scale radius by employee count
            pathOptions={{
              color: employer.color,
              fillColor: employer.color,
              fillOpacity: 0.3,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-center min-w-[280px]">
                <div className="flex items-center justify-center mb-3">
                  <Building2 className="h-5 w-5 mr-2 text-gray-600" />
                  <h3 className="font-semibold text-gray-800">{employer.name}</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    <Badge className={getIndustryColor(employer.industry)}>
                      {employer.industry}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Users className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="font-medium">{employer.employees.toLocaleString()}</span>
                      </div>
                      <span className="text-xs text-gray-500">Employees</span>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <TrendingUp className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="font-medium">{employer.growth}</span>
                      </div>
                      <span className="text-xs text-gray-500">Growth</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                      <span className="text-sm">{employer.distance}</span>
                    </div>
                    <span className="text-xs text-gray-500">From Project Site</span>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-xs text-gray-600">{employer.description}</p>
                  </div>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}
        
        {/* Project Site Marker */}
        <Circle
          center={siteCenter as [number, number]}
          radius={100}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.8,
            weight: 3,
          }}
        >
          <Popup>
            <div className="text-center">
              <MapPin className="h-5 w-5 mx-auto mb-2 text-red-600" />
              <h3 className="font-semibold text-gray-800">Downtown Highrise</h3>
              <p className="text-sm text-gray-600">Our Project</p>
              <p className="text-sm text-gray-600">120 Units • 8 Stories</p>
              <p className="text-sm text-gray-600">Target: Tech & Finance Workers</p>
            </div>
          </Popup>
        </Circle>
        
        {/* Employment Summary Overlay */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-[250px]">
          <h4 className="font-semibold text-gray-800 text-sm mb-3">Employment Summary</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Employers:</span>
              <span className="font-medium">{employers.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Jobs:</span>
              <span className="font-medium">{totalEmployees.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Growth:</span>
              <span className="font-medium text-green-600">+{avgGrowth.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Distance:</span>
              <span className="font-medium">2.3 miles</span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h5 className="font-medium text-gray-800 text-xs mb-2">Top Industries</h5>
            <div className="space-y-1">
              {['Technology', 'Healthcare', 'Finance'].map((industry, index) => (
                <div key={index} className="flex items-center text-xs">
                  <div 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ 
                      backgroundColor: industry === 'Technology' ? '#3b82f6' : 
                                   industry === 'Healthcare' ? '#10b981' : '#f59e0b' 
                    }}
                  />
                  <span className="text-gray-600">{industry}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
          <h4 className="font-semibold text-gray-800 text-sm mb-2">Employee Size</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded mr-2 bg-purple-500" />
              <span className="text-gray-700">10K+ employees</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded mr-2 bg-blue-500" />
              <span className="text-gray-700">5K-10K employees</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded mr-2 bg-green-500" />
              <span className="text-gray-700">2K-5K employees</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded mr-2 bg-gray-500" />
              <span className="text-gray-700">&lt;2K employees</span>
            </div>
          </div>
        </div>
      </MapContainer>
    </div>
  );
} 