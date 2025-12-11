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
import { formatLocale, parseNumeric, getOMValue } from '@/lib/om-utils';

// Component to show missing values in red
const MissingValue = ({ children }: { children: React.ReactNode }) => (
  <span className="text-red-600 font-medium">{children}</span>
);

export default function AmenitiesPage() {
  const { content } = useOmContent();
  
  // Extract amenity-related fields from flat schema
  const amenityList = Array.isArray(content?.amenityList) ? content.amenityList : [];
  const amenitySF = parseNumeric(content?.amenitySF) ?? null;
  
  // Individual amenity SF fields
  const poolSF = parseNumeric(content?.poolSF) ?? null;
  const gymSF = parseNumeric(content?.gymSF) ?? null;
  const coworkingSF = parseNumeric(content?.coworkingSF) ?? null;
  const loungeSF = parseNumeric(content?.loungeSF) ?? null;
  const terraceSF = parseNumeric(content?.terraceSF) ?? null;
  const otherAmenitySF = parseNumeric(content?.otherAmenitySF) ?? null;
  
  // Map amenity names to their SF values
  const amenitySFMap: Record<string, number | null> = {
    'Swimming pool': poolSF,
    'Pool': poolSF,
    'Fitness center': gymSF,
    'Gym': gymSF,
    'Shared working space': coworkingSF,
    'Co-Working Space': coworkingSF,
    'Lounge': loungeSF,
    'Outdoor terrace': terraceSF,
    'Terrace': terraceSF,
  };
  
  // Transform flat amenityList to amenityDetails structure with SF values
  const amenityDetails = amenityList.map((amenity: string | { name?: string; size?: string; description?: string }, index: number) => {
    let name: string;
    let size: string | null = null;
    
    if (typeof amenity === 'string') {
      name = amenity;
    } else {
      name = amenity.name || `Amenity ${index + 1}`;
      size = amenity.size || null;
    }
    
    // Try to match amenity name to SF field
    if (!size) {
      const matchedSF = amenitySFMap[name] ?? null;
      if (matchedSF != null) {
        size = `${formatLocale(matchedSF)} SF`;
      }
    }
    
    return {
      name,
      size,
      description: typeof amenity === 'object' ? amenity.description || null : null,
    };
  });
  
  // Calculate total amenity SF from individual fields if amenitySF is not available
  const calculatedTotalAmenitySF = poolSF != null || gymSF != null || coworkingSF != null || loungeSF != null || terraceSF != null || otherAmenitySF != null
    ? (poolSF ?? 0) + (gymSF ?? 0) + (coworkingSF ?? 0) + (loungeSF ?? 0) + (terraceSF ?? 0) + (otherAmenitySF ?? 0)
    : null;
  
  const totalAmenitySF = amenitySF ?? calculatedTotalAmenitySF;
  
  const avgAmenitySize =
    totalAmenitySF != null && amenityDetails.length > 0
      ? Math.round(totalAmenitySF / amenityDetails.length)
      : null;
  
  // Commercial spaces from commercialSpaceMix
  const commercialSpaceMix = Array.isArray(content?.commercialSpaceMix) ? content.commercialSpaceMix : [];
  const commercialSpaces = commercialSpaceMix.map((space: any, index: number) => ({
    name: space.spaceType || space.name || space.type || `Commercial Space ${index + 1}`,
    tenant: space.tenant || null,
    size: space.squareFootage ? `${formatLocale(space.squareFootage)} SF` : null,
    leaseTerm: space.leaseTerm || null,
    annualRent: space.annualRent ? `$${formatLocale(space.annualRent)}` : null,
  }));
  
  const totalCommercialSF = commercialSpaces.reduce((sum: number, space: any) => {
    const numeric = parseInt((space.size ?? '').replace(/[^\d]/g, ''), 10);
    return sum + (Number.isNaN(numeric) ? 0 : numeric);
  }, 0);

  const getAmenityIcon = (name: string): LucideIcon => {
    const lowerName = name.toLowerCase();
    // Case-insensitive matching for amenity names
    if (lowerName.includes('pool') || lowerName.includes('swimming')) {
      return Waves;
    }
    if (lowerName.includes('fitness') || lowerName.includes('gym')) {
      return Heart;
    }
    if (lowerName.includes('lounge') || lowerName.includes('sky')) {
      return Sun;
    }
    if (lowerName.includes('work') || lowerName.includes('coworking') || lowerName.includes('shared')) {
      return Building2;
    }
    if (lowerName.includes('spa') || lowerName.includes('pet')) {
      return PawPrint;
    }
    if (lowerName.includes('concierge') || lowerName.includes('package')) {
      return Inbox;
    }
    if (lowerName.includes('terrace') || lowerName.includes('outdoor')) {
      return Sun;
    }
    return Building2;
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

  // Extract systems/ESG fields
  const adaCompliantPercent = parseNumeric(content?.adaCompliantPercent) ?? null;
  const hvacSystem = getOMValue(content, "hvacSystem");
  const roofTypeAge = getOMValue(content, "roofTypeAge");
  const solarCapacity = parseNumeric(content?.solarCapacity) ?? null;
  const evChargingStations = parseNumeric(content?.evChargingStations) ?? null;
  const leedGreenRating = getOMValue(content, "leedGreenRating");

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
              {amenityDetails.length > 0 ? amenityDetails.length : <MissingValue>0</MissingValue>}
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
              {totalAmenitySF != null
                ? `${formatLocale(totalAmenitySF)} SF`
                : <MissingValue>Not available</MissingValue>}
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
              {avgAmenitySize != null
                ? `${formatLocale(avgAmenitySize)} SF`
                : <MissingValue>N/A</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Per amenity space</p>
          </CardContent>
        </Card>
      </div>

      {/* Amenities Grid */}
      {amenityDetails.length > 0 ? (
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
                    {amenity.size ? (
                      <Badge variant="outline" className="text-xs border-gray-200">
                        {amenity.size}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-gray-200">
                        <MissingValue>Size N/A</MissingValue>
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {amenity.description ? (
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {amenity.description}
                    </p>
                  ) : (
                    <p className="text-gray-500 text-sm italic">
                      <MissingValue>No description available</MissingValue>
                    </p>
                  )}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Space Type</span>
                      <span className="font-medium text-gray-700">
                        <MissingValue>Not specified</MissingValue>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>Access</span>
                      <span className="font-medium text-gray-700">
                        <MissingValue>Not specified</MissingValue>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="mb-8">
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              <MissingValue>No amenities listed</MissingValue>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Commercial / Innovation Program */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader dataSourceFields={['commercial space mix', 'total commercial grsf']}>
          <h3 className="text-xl font-semibold text-gray-800">Commercial & Innovation Program</h3>
          <p className="text-sm text-gray-600">
            {totalCommercialSF > 0 
              ? `${formatLocale(totalCommercialSF)} SF total commercial space`
              : <MissingValue>Commercial space details not available</MissingValue>}
          </p>
        </CardHeader>
        <CardContent>
          {commercialSpaces.length > 0 ? (
            <div className="space-y-3">
              {commercialSpaces.map((space: { name?: string | null; tenant?: string | null; size?: string | null; leaseTerm?: string | null; annualRent?: string | null }, index: number) => (
                <div key={`commercial-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">
                      {space.name ? space.name : <MissingValue>Space {index + 1}</MissingValue>}
                    </p>
                    {space.tenant && (
                      <p className="text-xs text-gray-500 mt-1">Tenant: {space.tenant}</p>
                    )}
                    {space.leaseTerm && (
                      <p className="text-xs text-gray-500">{space.leaseTerm}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    {space.size ? (
                      <Badge variant="outline" className="border-gray-200 mb-1">
                        {space.size}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-gray-200 mb-1">
                        <MissingValue>Size N/A</MissingValue>
                      </Badge>
                    )}
                    {space.annualRent && (
                      <div className="text-xs text-gray-500 mt-1">{space.annualRent}/yr</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm italic">
              <MissingValue>No commercial spaces listed</MissingValue>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Amenity Categories */}
      {amenityDetails.length > 0 && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Amenity Categories</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Wellness & Fitness</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  {amenityDetails.filter(a => 
                    a.name?.toLowerCase().includes('pool') || 
                    a.name?.toLowerCase().includes('fitness') || 
                    a.name?.toLowerCase().includes('gym') ||
                    a.name?.toLowerCase().includes('spa')
                  ).map((amenity, idx) => (
                    <li key={`wellness-${idx}`} className="flex items-center">
                      <span className="text-green-500 mr-2">•</span>
                      <span>{amenity.name}</span>
                      {amenity.size && <span className="text-gray-400 ml-2">({amenity.size})</span>}
                    </li>
                  ))}
                  {amenityDetails.filter(a => 
                    a.name?.toLowerCase().includes('pool') || 
                    a.name?.toLowerCase().includes('fitness') || 
                    a.name?.toLowerCase().includes('gym') ||
                    a.name?.toLowerCase().includes('spa')
                  ).length === 0 && (
                    <li className="text-gray-500 italic">
                      <MissingValue>No wellness amenities listed</MissingValue>
                    </li>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Work & Social</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  {amenityDetails.filter(a => 
                    a.name?.toLowerCase().includes('work') || 
                    a.name?.toLowerCase().includes('lounge') || 
                    a.name?.toLowerCase().includes('terrace') ||
                    a.name?.toLowerCase().includes('concierge') ||
                    a.name?.toLowerCase().includes('shared')
                  ).map((amenity, idx) => (
                    <li key={`social-${idx}`} className="flex items-center">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{amenity.name}</span>
                      {amenity.size && <span className="text-gray-400 ml-2">({amenity.size})</span>}
                    </li>
                  ))}
                  {amenityDetails.filter(a => 
                    a.name?.toLowerCase().includes('work') || 
                    a.name?.toLowerCase().includes('lounge') || 
                    a.name?.toLowerCase().includes('terrace') ||
                    a.name?.toLowerCase().includes('concierge') ||
                    a.name?.toLowerCase().includes('shared')
                  ).length === 0 && (
                    <li className="text-gray-500 italic">
                      <MissingValue>No work/social amenities listed</MissingValue>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Amenity Features - Show if we have pool or fitness amenities */}
      {(poolSF != null || gymSF != null || amenityDetails.some(a => a.name?.toLowerCase().includes('pool') || a.name?.toLowerCase().includes('fitness'))) && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Premium Features</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {poolSF != null || amenityDetails.some(a => a.name?.toLowerCase().includes('pool')) ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Waves className="h-8 w-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    {amenityDetails.find(a => a.name?.toLowerCase().includes('pool'))?.name || 'Swimming Pool'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {poolSF != null ? `${formatLocale(poolSF)} SF` : <MissingValue>Size not available</MissingValue>}
                  </p>
                </div>
              ) : null}
              {gymSF != null || amenityDetails.some(a => a.name?.toLowerCase().includes('fitness') || a.name?.toLowerCase().includes('gym')) ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Heart className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    {amenityDetails.find(a => a.name?.toLowerCase().includes('fitness') || a.name?.toLowerCase().includes('gym'))?.name || 'Fitness Center'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {gymSF != null ? `${formatLocale(gymSF)} SF` : <MissingValue>Size not available</MissingValue>}
                  </p>
                </div>
              ) : null}
              {coworkingSF != null || amenityDetails.some(a => a.name?.toLowerCase().includes('work') || a.name?.toLowerCase().includes('shared')) ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Building2 className="h-8 w-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    {amenityDetails.find(a => a.name?.toLowerCase().includes('work') || a.name?.toLowerCase().includes('shared'))?.name || 'Co-Working Space'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {coworkingSF != null ? `${formatLocale(coworkingSF)} SF` : <MissingValue>Size not available</MissingValue>}
                  </p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Systems & ESG Compliance */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Systems & ESG Compliance</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">ADA Compliant</p>
              <p className="text-lg font-semibold text-gray-800">
                {adaCompliantPercent != null ? `${adaCompliantPercent}%` : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">HVAC System</p>
              <p className="text-lg font-semibold text-gray-800">
                {hvacSystem ? hvacSystem : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Roof Type/Age</p>
              <p className="text-lg font-semibold text-gray-800">
                {roofTypeAge ? roofTypeAge : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Solar Capacity</p>
              <p className="text-lg font-semibold text-gray-800">
                {solarCapacity != null ? `${solarCapacity} kW` : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">EV Charging Stations</p>
              <p className="text-lg font-semibold text-gray-800">
                {evChargingStations != null ? evChargingStations : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">LEED/Green Rating</p>
              <p className="text-lg font-semibold text-gray-800">
                {leedGreenRating ? leedGreenRating : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 