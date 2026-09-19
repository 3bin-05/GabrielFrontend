"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { MapPoint, MapRoute } from "./MapContainer";

const MapContainer = dynamic(() => import("./MapContainer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-[24px] bg-[#F3F3F3] border border-[#E0E0E0] flex flex-col items-center justify-center animate-pulse">
      <div className="w-6 h-6 rounded-full border-2 border-[#141414] border-t-transparent animate-spin mb-2" />
      <span className="text-xs font-mono font-medium text-[#707070] uppercase tracking-wider">
        Loading Tactical GPS Grid...
      </span>
    </div>
  ),
});

export interface DynamicMapProps {
  markers?: MapPoint[];
  route?: MapRoute;
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
  showTelemetryOverlay?: boolean;
  interactive?: boolean;
}

export function DynamicMap(props: DynamicMapProps) {
  return <MapContainer {...props} />;
}

export type { MapPoint, MapRoute };
