'use client';

import { assetProfileDetails } from '@/services/mockOMData';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Waves, 
  Heart, 
  Building2, 
  Sun, 
  PawPrint, 
  Inbox
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export default function AmenitiesPage() {
  const getAmenityIcon = (name: string): LucideIcon => {
    const iconMap: { [key: string]: LucideIcon } = {
      'Resort-Style Pool': Waves,
      'Fitness Center': Heart,
      'Sky Lounge': Sun,
      'Co-Working Space': Building2,
      'Pet Spa': PawPrint,
      'Package Concierge': Inbox,
    };
    return iconMap[name] || Building2;
  };

  const getAmenityColor = (index: number) => {
    const colors = [
      'border-blue-200 bg-blue-50',
      'border-green-200 bg-green-50',
      'border-purple-200 bg-purple-50',
      'border-orange-200 bg-orange-50',
      'border-pink-200 bg-pink-50',
      'border-indigo-200 bg-indigo-50',
    ];
    return colors[index % colors.length];
  };

  const totalAmenitySF = assetProfileDetails.amenityDetails.reduce(
    (sum, amenity) => sum + parseInt(amenity.size.replace(/[^\d]/g, '')), 
    0
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Amenities</h1>
        <p className="text-gray-600 mt-2">Premium lifestyle amenities and shared spaces</p>
      </div>

      {/* Amenities Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-gray-800">Total Amenities</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{assetProfileDetails.amenityDetails.length}</p>
            <p className="text-sm text-gray-500 mt-1">Unique amenity spaces</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-gray-800">Total SF</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{totalAmenitySF.toLocaleString()} SF</p>
            <p className="text-sm text-gray-500 mt-1">Combined amenity space</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-gray-800">Avg Size</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">
              {Math.round(totalAmenitySF / assetProfileDetails.amenityDetails.length).toLocaleString()} SF
            </p>
            <p className="text-sm text-gray-500 mt-1">Per amenity space</p>
          </CardContent>
        </Card>
      </div>

      {/* Amenities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {assetProfileDetails.amenityDetails.map((amenity, index) => {
          const IconComponent = getAmenityIcon(amenity.name);
          const amenityColor = getAmenityColor(index);
          
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${amenityColor}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800">{amenity.name}</h3>
                  </div>
                  <Badge variant="outline" className="text-xs border-gray-200">
                    {amenity.size}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {amenity.description}
                </p>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Space Type</span>
                    <span className="font-medium text-gray-700">Shared</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>Access</span>
                    <span className="font-medium text-gray-700">24/7</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Amenity Categories */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Amenity Categories</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Wellness & Fitness</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Resort-Style Pool with cabanas
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Fitness Center with Peloton bikes
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Pet Spa and grooming station
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Work & Social</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Co-Working Space with offices
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Sky Lounge rooftop terrace
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Package Concierge with lockers
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amenity Features */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Premium Features</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Waves className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Heated Pool</h4>
              <p className="text-sm text-gray-600">Saltwater pool with temperature control</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">24/7 Access</h4>
              <p className="text-sm text-gray-600">Round-the-clock fitness center access</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sun className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">City Views</h4>
              <p className="text-sm text-gray-600">Panoramic views from sky lounge</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 