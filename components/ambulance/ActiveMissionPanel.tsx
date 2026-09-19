import React, { useState } from "react";
import { Incident, IncidentStatus } from "@/types/incident";
import { Hospital } from "@/types/hospital";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IncidentTimeline } from "@/components/citizen/IncidentTimeline";
import { HospitalSelectorModal } from "./HospitalSelectorModal";
import { DynamicMap, MapPoint, MapRoute } from "@/components/map/DynamicMap";
import {
  Navigation,
  MapPin,
  Users,
  Building2,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Radio,
  Maximize2,
} from "lucide-react";

interface ActiveMissionPanelProps {
  incident: Incident;
  onUpdateStatus: (
    newStatus: IncidentStatus,
    targetHospitalId?: string
  ) => Promise<void>;
  isUpdating?: boolean;
}

export function ActiveMissionPanel({
  incident,
  onUpdateStatus,
  isUpdating = false,
}: ActiveMissionPanelProps) {
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState<boolean>(false);

  const handleSelectHospital = async (hospital: Hospital) => {
    setIsHospitalModalOpen(false);
    await onUpdateStatus("HOSPITAL_NOTIFIED", hospital.id);
  };

  // Map markers & route setup
  const sceneLat = incident.location.latitude;
  const sceneLng = incident.location.longitude;

  // Position of ambulance dynamically relative to incident
  const ambLat = incident.status === "ARRIVED" || incident.status === "CLOSED"
    ? sceneLat + 0.015
    : incident.status === "PATIENT_PICKED_UP" || incident.status === "HOSPITAL_NOTIFIED" || incident.status === "EN_ROUTE_TO_HOSPITAL"
    ? sceneLat + 0.008
    : sceneLat - 0.006;

  const ambLng = incident.status === "ARRIVED" || incident.status === "CLOSED"
    ? sceneLng + 0.012
    : incident.status === "PATIENT_PICKED_UP" || incident.status === "HOSPITAL_NOTIFIED" || incident.status === "EN_ROUTE_TO_HOSPITAL"
    ? sceneLng + 0.006
    : sceneLng - 0.007;

  const hospitalLat = sceneLat + 0.015;
  const hospitalLng = sceneLng + 0.012;

  const mapMarkers: MapPoint[] = [
    {
      id: "scene",
      latitude: sceneLat,
      longitude: sceneLng,
      title: `Incident #${incident.incidentNumber}`,
      subtitle: `${incident.victimCount} Casualty • ${incident.severity}`,
      type: "accident",
      severity: (incident.severity === "MODERATE" ? "MEDIUM" : incident.severity) as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      status: incident.status,
    },
    {
      id: "ambulance",
      latitude: ambLat,
      longitude: ambLng,
      title: "Ambulance Unit (You)",
      subtitle: "GPS Active",
      type: "ambulance",
      status: incident.status,
      heading: 55,
      eta: incident.status === "AMBULANCE_ASSIGNED" || incident.status === "AMBULANCE_EN_ROUTE" ? "03:45" : "05:15",
    },
  ];

  if (incident.targetHospitalId || incident.status === "PATIENT_PICKED_UP" || incident.status === "HOSPITAL_NOTIFIED" || incident.status === "EN_ROUTE_TO_HOSPITAL" || incident.status === "ARRIVED") {
    mapMarkers.push({
      id: "hospital",
      latitude: hospitalLat,
      longitude: hospitalLng,
      title: incident.targetHospitalId ? `Hospital (${incident.targetHospitalId})` : "City Central Emergency Dept",
      subtitle: "Trauma Level 1 Ready",
      type: "hospital",
      status: "TRAUMA CORRIDOR ACTIVE",
    });
  }

  const mapRoute: MapRoute = {
    coordinates: incident.targetHospitalId
      ? [[ambLat, ambLng], [sceneLat, sceneLng], [hospitalLat, hospitalLng]]
      : [[ambLat, ambLng], [sceneLat, sceneLng]],
    distanceKm: 2.4,
    eta: incident.status === "AMBULANCE_ASSIGNED" || incident.status === "AMBULANCE_EN_ROUTE" ? "03:45" : "05:15",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Tactical Card */}
      <Card variant="surface" className="p-6 sm:p-8 border border-[#141414] shadow-sm">
        {/* Mission Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E0E0E0]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#141414] text-white flex items-center justify-center font-bold text-sm">
              <Navigation className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-[#707070] uppercase">
                  Active Mission Operation
                </span>
                <span className="w-2 h-2 rounded-full bg-green-600 animate-ping" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-mono font-bold text-[#141414]">
                #{incident.incidentNumber}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="dark" className="text-xs px-3.5 py-1 font-bold">
              {incident.status}
            </Badge>
            <Badge variant="default" className="text-xs px-3.5 py-1">
              {incident.severity}
            </Badge>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-6 border-b border-[#E0E0E0] text-xs">
          <div className="p-4 rounded-[16px] bg-white border border-[#E0E0E0]">
            <div className="text-[#707070] mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#141414]" /> Target Coordinates
            </div>
            <div className="text-sm font-mono font-bold text-[#141414]">
              {incident.location.latitude.toFixed(4)}, {incident.location.longitude.toFixed(4)}
            </div>
            <div className="text-[11px] text-[#707070] mt-0.5">Accident Scene locked</div>
          </div>

          <div className="p-4 rounded-[16px] bg-white border border-[#E0E0E0]">
            <div className="text-[#707070] mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#141414]" /> Casualties
            </div>
            <div className="text-sm font-bold text-[#141414]">
              {incident.victimCount} Person{incident.victimCount > 1 ? "s" : ""}
            </div>
            <div className="text-[11px] text-[#707070] mt-0.5">Paramedic triage active</div>
          </div>

          <div className="p-4 rounded-[16px] bg-white border border-[#E0E0E0]">
            <div className="text-[#707070] mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#141414]" /> Destination Hospital
            </div>
            <div className="text-sm font-bold text-[#141414]">
              {incident.targetHospitalId || "Pending Selection"}
            </div>
            <div className="text-[11px] text-[#707070] mt-0.5">
              {incident.targetHospitalId ? "Trauma alert active" : "Select after pickup"}
            </div>
          </div>

          <div className="p-4 rounded-[16px] bg-white border border-[#E0E0E0]">
            <div className="text-[#707070] mb-1 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#141414]" /> Telemetry Link
            </div>
            <div className="text-sm font-bold text-green-700 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Live GPS Stream
            </div>
            <div className="text-[11px] text-[#707070] mt-0.5">Broadcasting to network</div>
          </div>
        </div>

        {/* Tactical Navigation Map */}
        <div className="pt-6 pb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#141414]">
              Tactical Mission Route &amp; GPS Navigation
            </h3>
            <span className="text-[11px] font-mono text-[#707070]">
              Dynamic ETA: {mapRoute.eta}
            </span>
          </div>
          <DynamicMap
            markers={mapMarkers}
            route={mapRoute}
            height="360px"
            zoom={14}
          />
        </div>

        {/* Timeline Progress */}
        <div className="pt-2 pb-6">
          <IncidentTimeline currentStatus={incident.status} />
        </div>

        {/* Operational Driver Control Center */}
        <div className="p-6 rounded-[20px] bg-[#141414] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#ADADAD]">
              Current Action Step
            </div>
            <div className="text-base font-bold text-white mt-0.5">
              {incident.status === "AMBULANCE_ASSIGNED" || incident.status === "AMBULANCE_EN_ROUTE"
                ? "En Route to Accident Scene"
                : incident.status === "PATIENT_PICKED_UP"
                ? "Patient Picked Up • Destination Trauma Center Required"
                : incident.status === "HOSPITAL_NOTIFIED" || incident.status === "EN_ROUTE_TO_HOSPITAL"
                ? "Transporting Patient to Trauma Center"
                : incident.status === "ARRIVED"
                ? "Arrived at Hospital • Emergency Transfer Complete"
                : "Incident Closed"}
            </div>
          </div>

          {/* Action Step Transitions */}
          <div className="shrink-0 flex items-center gap-3">
            {(incident.status === "AMBULANCE_ASSIGNED" || incident.status === "AMBULANCE_EN_ROUTE") && (
              <Button
                variant="secondary"
                size="lg"
                disabled={isUpdating}
                isLoading={isUpdating}
                onClick={() => onUpdateStatus("PATIENT_PICKED_UP")}
                className="bg-white text-[#141414] hover:bg-[#F0F0F0] font-bold text-xs uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Patient Picked Up
              </Button>
            )}

            {incident.status === "PATIENT_PICKED_UP" && (
              <Button
                variant="secondary"
                size="lg"
                disabled={isUpdating}
                onClick={() => setIsHospitalModalOpen(true)}
                className="bg-white text-[#141414] hover:bg-[#F0F0F0] font-bold text-xs uppercase tracking-wider"
              >
                <Building2 className="w-4 h-4 mr-2" /> Select Destination Hospital
              </Button>
            )}

            {(incident.status === "HOSPITAL_NOTIFIED" || incident.status === "EN_ROUTE_TO_HOSPITAL") && (
              <Button
                variant="secondary"
                size="lg"
                disabled={isUpdating}
                isLoading={isUpdating}
                onClick={() => onUpdateStatus("ARRIVED")}
                className="bg-white text-[#141414] hover:bg-[#F0F0F0] font-bold text-xs uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Arrived at Hospital
              </Button>
            )}

            {incident.status === "ARRIVED" && (
              <Button
                variant="secondary"
                size="lg"
                disabled={isUpdating}
                isLoading={isUpdating}
                onClick={() => onUpdateStatus("CLOSED")}
                className="bg-white text-[#141414] hover:bg-[#F0F0F0] font-bold text-xs uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Close Mission &amp; Return Available
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Hospital Selector Modal */}
      <HospitalSelectorModal
        isOpen={isHospitalModalOpen}
        onClose={() => setIsHospitalModalOpen(false)}
        onSelectHospital={handleSelectHospital}
        incident={incident}
        isSubmitting={isUpdating}
      />
    </div>
  );
}
