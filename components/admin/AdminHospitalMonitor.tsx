import React from "react";
import { Hospital } from "@/types/hospital";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Building2, Bed, Phone, MapPin, Activity } from "lucide-react";

interface AdminHospitalMonitorProps {
  hospitals: Hospital[];
}

export function AdminHospitalMonitor({ hospitals }: AdminHospitalMonitorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {hospitals.map((h) => (
        <Card key={h.id} variant="white" className="p-5 border border-[#E0E0E0]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E0E0E0]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#141414] text-white flex items-center justify-center font-bold text-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#141414]">{h.name}</h4>
                <span className="text-[11px] text-[#707070]">{h.code}</span>
              </div>
            </div>

            <Badge variant="dark" className="text-[10px] px-2 py-0.5">
              {h.status}
            </Badge>
          </div>

          <div className="pt-3 space-y-2 text-xs text-[#707070]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#141414]">
                <Bed className="w-3.5 h-3.5 text-[#707070]" /> Available ICU Beds:
              </span>
              <strong className="text-base font-mono font-bold text-[#141414]">
                {h.availableBeds}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#141414]">
                <Activity className="w-3.5 h-3.5 text-[#707070]" /> Trauma Desk State:
              </span>
              <Badge variant="default" className="text-[10px] px-2 py-0.5">
                {h.emergencyDepartmentStatus || "IDLE"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#141414]">
                <Phone className="w-3.5 h-3.5 text-[#707070]" /> Direct Hotline:
              </span>
              <span className="text-[#141414]">{h.phone}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#F0F0F0]">
              <span className="flex items-center gap-1.5 text-[#707070]">
                <MapPin className="w-3.5 h-3.5 text-[#141414]" /> Location:
              </span>
              <span className="font-mono text-[#141414]">
                {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
