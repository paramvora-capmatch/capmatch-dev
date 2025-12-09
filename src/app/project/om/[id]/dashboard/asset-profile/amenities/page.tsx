'use client';

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
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { formatLocale } from '@/lib/om-utils';

export default function AmenitiesPage() {
  const { content } = useOmContent();
  
  // Access flat amenityList array directly
  const amenityList = Array.isArray(content?.amenityList) ? content.amenityList : [];
  
  // Transform flat amenityList to amenityDetails structure for UI
  const amenityDetails = amenityList.map((amenity: string | { name?: string; size?: string; description?: string }, index: number) => {
    if (typeof amenity === 'string') {
      return {
        name: amenity,
        size: null,
        description: null,
      };
    }
    return {
      name: amenity.name || `Amenity ${index + 1}`,
      size: amenity.size || null,
      description: amenity.description || null,
    };
  });
  
  // Commercial spaces from commercialSpaceMix if available
  const commercialSpaceMix = Array.isArray(content?.commercialSpaceMix) ? content.commercialSpaceMix : [];
  const commercialSpaces = commercialSpaceMix.map((space: any, index: number) => ({
    name: space.name || space.type || `Commercial Space ${index + 1}`,
    use: space.use || space.type || null,
    size: space.size || space.sf ? `${space.sf} SF` : null,
    status: space.status || 'Available',
  }));

  const totalAmenitySF =
    amenityDetails.length > 0
      ? amenityDetails.reduce((sum: number, amenity: { size?: string | null }) => {
          const numeric = parseInt(
            (amenity.size ?? '').replace(/[^\d]/g, ''),
            10
          );
          return sum + (Number.isNaN(numeric) ? 0 : numeric);
        }, 0)
      : null;

  const avgAmenitySize =
    totalAmenitySF != null && amenityDetails.length > 0
      ? Math.round(totalAmenitySF / amenityDetails.length)
      : null;

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
      'border-red-200 bg-red-50',
      'border-blue-200 bg-blue-50',
      'border-green-200 bg-green-50',
      'border-red-200 bg-red-50',
    ];
    return colors[index % colors.length];
  };

  useOMPageHeader({
    subtitle: "Inventory of onsite amenities and experiential highlights.",
  });

  return (
    <div className="space-y-6">

      {/* Amenities Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2" dataSourceFields={['amenity list']}>
            <h3 className="text-lg font-semibold text-gray-800">Total Amenities</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {amenityDetails.length > 0 ? amenityDetails.length : null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Unique amenity spaces</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2" dataSourceFields={['amenity sf']}>
            <h3 className="text-lg font-semibold text-gray-800">Total SF</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {formatLocale(totalAmenitySF) != null
                ? `${formatLocale(totalAmenitySF)} SF`
                : null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Combined amenity space</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-gray-800">Avg Size</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {formatLocale(avgAmenitySize) != null
                ? `${formatLocale(avgAmenitySize)} SF`
                : null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Per amenity space</p>
          </CardContent>
        </Card>
      </div>

      {/* Amenities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {amenityDetails.map((amenity: { name?: string | null; size?: string | null; description?: string | null }, index: number) => {
          const IconComponent = getAmenityIcon(amenity.name ?? '');
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
                    {amenity.size ?? null}
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

      {/* Commercial / Innovation Program */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader dataSourceFields={['total commercial grsf', 'space type']}>
          <h3 className="text-xl font-semibold text-gray-800">Commercial & Innovation Program</h3>
          <p className="text-sm text-gray-600">30,000 SF Innovation Center plus flexible office/retail bays</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {commercialSpaces.map((space: { name?: string | null; use?: string | null; size?: string | null; status?: string | null }, index: number) => (
              <div key={`commercial-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{space.name ?? null}</p>
                  <p className="text-xs text-gray-500">{space.use ?? null}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-gray-200 mb-1">
                    {space.size ?? null}
                  </Badge>
                  <div className="text-xs text-gray-500">{space.status ?? null}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sun className="h-8 w-8 text-blue-600" />
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