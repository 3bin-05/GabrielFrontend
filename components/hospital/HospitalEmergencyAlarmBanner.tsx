"use client";

import React, { useState, useEffect } from "react";
import { Incident } from "@/types/incident";
import { emergencySiren } from "@/lib/audio";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  BellRing,
  Volume2,
  VolumeX,
  Navigation,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  MapPin,
} from "lucide-react";

interface HospitalEmergencyAlarmBannerProps {
  incident: Incident;
  onAcknowledge: (incident: Incident) => void;
  isAcknowledged: boolean;
  isProcessing?: boolean;
}

export function HospitalEmergencyAlarmBanner({
  incident,
  onAcknowledge,
  isAcknowledged,
  isProcessing = false,
}: HospitalEmergencyAlarmBannerProps) {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  useEffect(() => {
    // If not acknowledged, trigger emergency siren
    if (!isAcknowledged && !isMuted && hasInteracted) {
      emergencySiren.start();
    } else {
      emergencySiren.stop();
    }

    return () => {
      emergencySiren.stop();
    };
  }, [isAcknowledged, isMuted, hasInteracted]);

  const toggleMute = () => {
    setHasInteracted(true);
    if (isMuted) {
      setIsMuted(false);
      if (!isAcknowledged) emergencySiren.start();
    } else {
      setIsMuted(true);
      emergencySiren.stop();
    }
  };

  const handleAcknowledgeClick = () => {
    setHasInteracted(true);
    emergencySiren.stop();
    onAcknowledge(incident);
  };

  return (
    <Card
      variant="dark"
      className={`p-6 sm:p-8 bg-[#141414] text-white border-2 transition-all duration-300 relative overflow-hidden shadow-2xl ${
        !isAcknowledged
          ? "border-red-500 animate-pulse-subtle"
          : "border-white"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#262626]">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              !isAcknowledged
                ? "bg-red-600 text-white animate-pulse"
                : "bg-white text-[#141414]"
            }`}
          >
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-red-400">
                {!isAcknowledged
                  ? "Incoming Emergency Trauma Alert"
                  : "Trauma Alert Acknowledged"}
              </span>
              {!isAcknowledged && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-mono font-bold text-white mt-0.5">
              Incident #{incident.incidentNumber}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMute}
            className="p-2.5 rounded-full bg-[#262626] hover:bg-[#333333] text-white text-xs flex items-center gap-1.5 transition-colors border border-[#3A3A3A]"
            title={isMuted ? "Unmute Siren" : "Mute Siren"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-red-400 animate-pulse" />}
            <span className="text-[11px] font-mono">{isMuted ? "MUTED" : "SIREN ON"}</span>
          </button>

          <Badge variant="dark" className="bg-red-950 text-red-200 border-red-700 text-xs px-3.5 py-1 font-bold">
            {incident.severity}
          </Badge>
        </div>
      </div>

      {/* Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-5 border-b border-[#262626] text-xs">
        <div className="p-4 rounded-[16px] bg-[#1E1E1E] border border-[#2B2B2B]">
          <div className="text-[#ADADAD] mb-1 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-white" /> Inbound Ambulance
          </div>
          <div className="text-sm font-bold text-white">
            {incident.assignedAmbulanceId || "Unit A-01"}
          </div>
          <div className="text-[11px] text-[#ADADAD] mt-0.5">Paramedic unit in transit</div>
        </div>

        <div className="p-4 rounded-[16px] bg-[#1E1E1E] border border-[#2B2B2B]">
          <div className="text-[#ADADAD] mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-white" /> Estimated Arrival (ETA)
          </div>
          <div className="text-sm font-mono font-bold text-white">
            04:32 min
          </div>
          <div className="text-[11px] text-[#ADADAD] mt-0.5">Traffic priority active</div>
        </div>

        <div className="p-4 rounded-[16px] bg-[#1E1E1E] border border-[#2B2B2B]">
          <div className="text-[#ADADAD] mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-white" /> Incoming Casualties
          </div>
          <div className="text-sm font-bold text-white">
            {incident.victimCount} Patient{incident.victimCount > 1 ? "s" : ""}
          </div>
          <div className="text-[11px] text-[#ADADAD] mt-0.5">Prepare trauma bay</div>
        </div>

        <div className="p-4 rounded-[16px] bg-[#1E1E1E] border border-[#2B2B2B]">
          <div className="text-[#ADADAD] mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-white" /> Incident Scene
          </div>
          <div className="text-sm font-mono font-bold text-white">
            {incident.location.latitude.toFixed(4)}, {incident.location.longitude.toFixed(4)}
          </div>
          <div className="text-[11px] text-[#ADADAD] mt-0.5">Direct telemetry link</div>
        </div>
      </div>

      {incident.description && (
        <div className="my-4 p-3.5 rounded-[14px] bg-[#1E1E1E] border border-[#2B2B2B] text-xs text-[#E0E0E0] italic">
          &ldquo;{incident.description}&rdquo;
        </div>
      )}

      {/* Alarm Acknowledge Action Area */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-[#ADADAD]">
          {!isAcknowledged
            ? "⚠ Audible siren sounding at trauma desk. Staff must acknowledge and prepare emergency department."
            : "✓ Alarm acknowledged. Surgical trauma team standing by."}
        </div>

        {!isAcknowledged ? (
          <Button
            variant="primary"
            size="lg"
            disabled={isProcessing}
            isLoading={isProcessing}
            onClick={handleAcknowledgeClick}
            className="w-full sm:w-auto bg-white text-[#141414] hover:bg-[#F0F0F0] font-bold text-xs uppercase tracking-wider h-14 px-8 shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" /> Acknowledge &amp; Silence Alarm
          </Button>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#262626] text-white text-xs font-semibold uppercase tracking-wider border border-[#3A3A3A]">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Alarm Silenced • Staff Alerted
          </div>
        )}
      </div>
    </Card>
  );
}
