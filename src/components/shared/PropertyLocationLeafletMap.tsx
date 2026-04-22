"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, MapPin } from "lucide-react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker asset paths for Leaflet in Next.js.
// @ts-expect-error Leaflet types do not expose _getIconUrl on Default
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
	iconUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
	shadowUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface PropertyLocationLeafletMapProps {
	address: string;
	projectName?: string | null;
}

interface GeocodeResult {
	lat: number;
	lon: number;
	displayName: string;
}

function MapSizeInvalidator() {
	const map = useMap();

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			map.invalidateSize();
		}, 0);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [map]);

	return null;
}

export function PropertyLocationLeafletMap({
	address,
	projectName,
}: PropertyLocationLeafletMapProps) {
	const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const abortController = new AbortController();

		async function loadCoordinates() {
			setIsLoading(true);
			setError(null);
			setGeocodeResult(null);

			try {
				const response = await fetch(
					`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
						address
					)}`,
					{
						signal: abortController.signal,
						headers: {
							Accept: "application/json",
						},
					}
				);

				if (!response.ok) {
					throw new Error(`Geocoding failed with status ${response.status}`);
				}

				const results = (await response.json()) as Array<{
					lat?: string;
					lon?: string;
					display_name?: string;
				}>;

				const firstResult = results[0];
				const latitude = Number(firstResult?.lat);
				const longitude = Number(firstResult?.lon);

				if (!firstResult || Number.isNaN(latitude) || Number.isNaN(longitude)) {
					throw new Error("No geocoding result found for this address");
				}

				setGeocodeResult({
					lat: latitude,
					lon: longitude,
					displayName: firstResult.display_name || address,
				});
			} catch (fetchError) {
				if (abortController.signal.aborted) {
					return;
				}

				setError(
					fetchError instanceof Error
						? fetchError.message
						: "Unable to load map coordinates"
				);
			} finally {
				if (!abortController.signal.aborted) {
					setIsLoading(false);
				}
			}
		}

		void loadCoordinates();

		return () => {
			abortController.abort();
		};
	}, [address]);

	if (isLoading) {
		return (
			<div className="flex aspect-[16/9] w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
				Loading map...
			</div>
		);
	}

	if (!geocodeResult) {
		return (
			<div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 bg-gray-100 px-6 text-center">
				<AlertCircle className="h-5 w-5 text-amber-500" />
				<p className="text-sm font-medium text-gray-700">Unable to load map</p>
				<p className="text-xs text-gray-500">
					{error || "No map location could be resolved for this property."}
				</p>
			</div>
		);
	}

	const center: [number, number] = [geocodeResult.lat, geocodeResult.lon];

	return (
		<div className="aspect-[16/9] w-full print:hidden">
			<MapContainer
				center={center}
				zoom={16}
				scrollWheelZoom={false}
				style={{ height: "100%", width: "100%" }}
			>
				<MapSizeInvalidator />
				<TileLayer
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				/>
				<Circle
					center={center}
					radius={120}
					pathOptions={{
						color: "#2563eb",
						fillColor: "#60a5fa",
						fillOpacity: 0.14,
						weight: 1,
					}}
				/>
				<Marker position={center}>
					<Popup>
						<div className="min-w-[180px] space-y-1">
							<div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
								<MapPin className="h-4 w-4 text-blue-600" />
								<span>{projectName || "Property Location"}</span>
							</div>
							<p className="text-xs text-gray-700">{address}</p>
							<p className="text-[11px] text-gray-500">
								Resolved via OpenStreetMap geocoding.
							</p>
						</div>
					</Popup>
				</Marker>
			</MapContainer>
		</div>
	);
}
