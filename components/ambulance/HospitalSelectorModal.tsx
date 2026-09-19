import React, { useState, useEffect } from "react";
import { Hospital } from "@/types/hospital";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Building2, X, Clock, MapPin, Bed, Check } from "lucide-react";

interface HospitalSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHospital: (hospital: Hospital) => void;
  isSubmitting?: boolean;
}

export function HospitalSelectorModal({
  isOpen,
  onClose,
  onSelectHospital,
  isSubmitting = false,
}: HospitalSelectorModalProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      api
        .getHospitals()
        .then((data) => setHospitals(data))
        .catch(() => setHospitals([]))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-[24px] border border-[#E0E0E0] shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E0E0E0]">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#707070] mb-0.5">
              Destination Routing
            </div>
            <h2 className="text-xl font-bold text-[#141414]">
              Select Destination Trauma Center
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F0F0F0] text-[#707070] hover:text-[#141414]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Hospitals */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#141414] border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-xs text-[#707070]">Locating nearby trauma centers...</p>
            </div>
          ) : hospitals.length === 0 ? (
            <p className="text-sm text-center text-[#707070] py-8">
              No trauma centers found in dispatch registry.
            </p>
          ) : (
            hospitals.map((h, index) => {
              const distanceKm = (2.4 + index * 1.3).toFixed(1);
              const etaMinutes = (6 + index * 4).toString();

              return (
                <div
                  key={h.id}
                  className="p-5 rounded-[18px] bg-[#F3F3F3] border border-[#E0E0E0] hover:border-[#141414] transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white text-[#141414] flex items-center justify-center shrink-0 shadow-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#141414]">{h.name}</h4>
                        <Badge variant="dark" className="text-[10px] px-2 py-0.5">
                          {h.code}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#707070] mt-0.5">{h.address}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#141414] font-medium mt-2">
                        <span className="flex items-center gap-1 text-[#707070]">
                          <MapPin className="w-3.5 h-3.5 text-[#141414]" /> {distanceKm} km
                        </span>
                        <span className="flex items-center gap-1 text-[#707070]">
                          <Clock className="w-3.5 h-3.5 text-[#141414]" /> ETA: ~{etaMinutes} min
                        </span>
                        <span className="flex items-center gap-1 text-[#707070]">
                          <Bed className="w-3.5 h-3.5 text-[#141414]" /> {h.availableBeds} ICU Beds
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => onSelectHospital(h)}
                    className="shrink-0 self-end sm:self-center text-xs font-semibold uppercase tracking-wider"
                  >
                    Select Hospital
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#E0E0E0] text-right">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
