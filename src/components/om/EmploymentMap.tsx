'use client';

import React from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, Users, TrendingUp, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Fix for default markers in react-leaflet
import L from 'leaflet';
// @ts-expect-error Leaflet type lacks _getIconUrl on Default icon prototype
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
  // Mock employment data - 2300 Hickory St, Dallas, TX 75215
  const siteCenter = [32.7800, -96.7900]; // Dallas coordinates
  
  const employers = [
    {
      position: [32.7806, -96.7906],
      name: 'AT&T Discovery District',
      employees: 5200,
      growth: '+6%',
      industry: 'Technology',
      distance: '0.6 miles',
      color: '#3b82f6',
      description: 'AT&T corporate campus and innovation hub in Downtown Dallas'
    },
    {
      position: [32.7795, -96.7895],
      name: 'Baylor Univ. Medical Center',
      employees: 7800,
      growth: '+3%',
      industry: 'Healthcare',
      distance: '1.1 miles',
      color: '#10b981',
      description: 'Major medical center serving Downtown Dallas and surrounding communities'
    },
    {
      position: [32.7803, -96.7898],
      name: 'Dallas County Government Campus',
      employees: 4200,
      growth: '+1%',
      industry: 'Government',
      distance: '0.8 miles',
      color: '#8b5cf6',
      description: 'Dallas County Government administrative campus'
    },
    {
      position: [32.7810, -96.7885],
      name: 'JP Morgan Chase Regional HQ',
      employees: 5100,
      growth: '+5%',
      industry: 'Finance',
      distance: '1.8 miles',
      color: '#f59e0b',
      description: 'JP Morgan Chase regional headquarters and operations center'
    },
    {
      position: [32.7775, -96.7895],
      name: 'Pegasus Park BioLabs',
      employees: 3400,
      growth: '+8%',
      industry: 'Biotechnology',
      distance: '3.5 miles',
      color: '#84cc16',
      description: 'Biotechnology research and development facility in South Dallas'
    }
  ];

  const getIndustryColor = (industry: string) => {
    const colors: { [key: string]: string } = {
      'Technology': 'bg-blue-100 text-blue-800',
      'Healthcare': 'bg-green-100 text-green-800',
      'Finance': 'bg-yellow-100 text-yellow-800',
      'Government': 'bg-purple-100 text-purple-800',
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
              <h3 className="font-semibold text-gray-800">SoGood Apartments</h3>
              <p className="text-sm text-gray-600">Our Project</p>
              <p className="text-sm text-gray-600">116 Units • 6 Stories</p>
              <p className="text-sm text-gray-600">2300 Hickory St, Dallas, TX</p>
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