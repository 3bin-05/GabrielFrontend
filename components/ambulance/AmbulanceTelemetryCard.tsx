import React from "react";
import { Ambulance, AmbulanceStatus } from "@/types/ambulance";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AmbulanceStatusSelector } from "./AmbulanceStatusSelector";
import { Navigation, Radio, MapPin, Gauge, Compass } from "lucide-react";

interface AmbulanceTelemetryCardProps {
  ambulance: Ambulance;
  onStatusChange: (status: AmbulanceStatus) => void;
  disabled?: boolean;
}

export function AmbulanceTelemetryCard({
  ambulance,
  onStatusChange,
  disabled = false,
}: AmbulanceTelemetryCardProps) {
  return (
    <Card variant="white" className="p-6 border border-[#E0E0E0]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E0E0E0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#141414] text-white flex items-center justify-center font-bold text-xs">
            A-01
          </div>
          <div>
            <h3 className="font-bold text-base text-[#141414]">
              {ambulance.vehicleNumber}
            </h3>
            <p className="text-xs text-[#707070]">
              Driver: {ambulance.driverName} ({ambulance.driverPhone})
            </p>
          </div>
        </div>

        <Badge
          variant="dark"
          className={
            ambulance.status === "AVAILABLE"
              ? "bg-green-700"
              : ambulance.status === "RESPONDING"
              ? "bg-amber-600"
              : ambulance.status === "TRANSPORTING"
              ? "bg-blue-600"
              : "bg-gray-600"
          }
        >
          {ambulance.status}
        </Badge>
      </div>

      {/* Driver Status Mode Switcher */}
      <div className="py-4 border-b border-[#E0E0E0]">
        <div className="text-xs font-bold uppercase tracking-wider text-[#141414] mb-2">
          Fleet Availability Control
        </div>
        <AmbulanceStatusSelector
          currentStatus={ambulance.status}
          onStatusChange={onStatusChange}
          disabled={disabled}
        />
      </div>

      {/* Live Telemetry Data */}
      <div className="pt-4 grid grid-cols-2 gap-3 text-xs text-[#707070]">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-[#141414]" />
          <span>
            GPS:{" "}
            <strong className="text-[#141414] font-mono">
              {ambulance.latitude.toFixed(4)}, {ambulance.longitude.toFixed(4)}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-[#141414]" />
          <span>
            Speed: <strong className="text-[#141414]">{ambulance.speed || 0} km/h</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-[#141414]" />
          <span>
            Heading: <strong className="text-[#141414]">{ambulance.heading || 90}° E</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-[#141414]" />
          <span>
            Telemetry Link: <strong className="text-green-700">Online</strong>
          </span>
        </div>
      </div>
    </Card>
  );
}
