import React from "react";
import dynamic from "next/dynamic";
import { ExternalLink, MapPin } from "lucide-react";

import { cn } from "@/utils/cn";

const PropertyLocationLeafletMap = dynamic(
	() =>
		import("@/components/shared/PropertyLocationLeafletMap").then(
			(module) => module.PropertyLocationLeafletMap
		),
	{
		ssr: false,
		loading: () => (
			<div className="flex aspect-[16/9] w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
				Loading map...
			</div>
		),
	}
);

interface PropertyLocationMapProps {
	address?: string | null;
	projectName?: string | null;
	className?: string;
}

export const PropertyLocationMap: React.FC<PropertyLocationMapProps> = ({
	address,
	projectName,
	className,
}) => {
	const normalizedAddress = address?.trim();

	if (!normalizedAddress) {
		return null;
	}

	const encodedAddress = encodeURIComponent(normalizedAddress);
	const streetViewUrl = `https://www.google.com/maps?q=${encodedAddress}&layer=c`;

	return (
		<div
			className={cn(
				"rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden",
				className
			)}
		>
			<div className="border-b border-gray-200 px-5 py-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
							<MapPin className="h-4 w-4 text-blue-600" />
							<span>Map & Street View</span>
						</div>
						<p className="mt-1 text-sm text-gray-600">
							{projectName ? `${projectName} at ` : ""}
							{normalizedAddress}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<a
							href={streetViewUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
						>
							Open Street View
							<ExternalLink className="h-3.5 w-3.5" />
						</a>
					</div>
				</div>
			</div>

			<PropertyLocationLeafletMap
				address={normalizedAddress}
				projectName={projectName}
			/>
		</div>
	);
};
