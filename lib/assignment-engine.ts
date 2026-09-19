import { Incident, IncidentSeverity, IncidentStatus } from "@/types/incident";
import { Ambulance, AmbulanceLevel, AmbulanceStatus, AMBULANCE_LEVEL_CONFIGS } from "@/types/ambulance";
import { Hospital, HospitalStatus } from "@/types/hospital";
import {
  getIncidentById,
  getIncidents,
  updateIncident,
  getAmbulances,
  getAmbulanceById,
  updateAmbulance,
  getHospitals,
  getHospitalById,
} from "@/lib/db";
import { broadcastEvent } from "@/lib/events";

export interface RankedAmbulance {
  ambulance: Ambulance;
  distanceKm: number;
  etaMinutes: number;
  etaFormatted: string;
  capabilityScore: number;
  isOptimalLevel: boolean;
  matchScore: number;
  matchReason: string;
}

export interface RankedHospital {
  hospital: Hospital;
  distanceKm: number;
  etaMinutes: number;
  etaFormatted: string;
  suitabilityScore: number;
  handlesSeverity: boolean;
  availableBeds: number;
  isPrimaryRecommended: boolean;
  recommendationReason: string;
}

export interface FilteredHospital {
  hospital: Hospital;
  reason: string;
}

export interface AssignmentResult {
  incident: Incident;
  matchedAmbulance: RankedAmbulance | null;
  candidateAmbulances: RankedAmbulance[];
  recommendedHospital: RankedHospital | null;
  alternativeHospitals: RankedHospital[];
  filteredOutHospitals: FilteredHospital[];
  summary: string;
  autoCommitted: boolean;
}

/**
 * Calculates geographical distance in kilometers between two GPS coordinates using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Calculates estimated transit time (ETA) based on urban emergency response speed (average ~40 km/h).
 */
export function calculateETA(
  distanceKm: number,
  averageSpeedKmh = 40
): { etaMinutes: number; etaFormatted: string } {
  const calculatedMinutes = Math.max(1, (distanceKm / averageSpeedKmh) * 60);
  const totalSeconds = Math.round(calculatedMinutes * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const etaFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return {
    etaMinutes: Math.round(calculatedMinutes * 10) / 10,
    etaFormatted,
  };
}

/**
 * Evaluates the capability suitability score of an ambulance for a specific incident severity.
 */
export function evaluateAmbulanceCapability(
  level: AmbulanceLevel = "TYPE_C",
  severity: IncidentSeverity
): { capabilityScore: number; isOptimalLevel: boolean; reason: string } {
  switch (severity) {
    case "CRITICAL":
      if (level === "TYPE_D") {
        return {
          capabilityScore: 100,
          isOptimalLevel: true,
          reason: "Level D Mobile ICU (ALS) with mechanical ventilator & cardiac defibrillator for critical life support.",
        };
      }
      if (level === "TYPE_C") {
        return {
          capabilityScore: 65,
          isOptimalLevel: false,
          reason: "Level C (BLS) unit available for rapid stabilization and resuscitation.",
        };
      }
      return {
        capabilityScore: 0,
        isOptimalLevel: false,
        reason: "Vehicle tier (Level A/B) lacks critical life support resuscitation equipment.",
      };

    case "HIGH":
      if (level === "TYPE_D") {
        return {
          capabilityScore: 100,
          isOptimalLevel: true,
          reason: "Level D Mobile ICU equipped for severe multi-trauma and invasive stabilization.",
        };
      }
      if (level === "TYPE_C") {
        return {
          capabilityScore: 95,
          isOptimalLevel: true,
          reason: "Level C Basic Life Support with ECG rhythm monitoring, suction, and immobilization.",
        };
      }
      if (level === "TYPE_B") {
        return {
          capabilityScore: 40,
          isOptimalLevel: false,
          reason: "Level B transport unit lacks advanced immobilization and vital monitoring kit.",
        };
      }
      return {
        capabilityScore: 0,
        isOptimalLevel: false,
        reason: "First-responder unit cannot transport severe trauma casualties.",
      };

    case "MODERATE":
      if (level === "TYPE_C") {
        return {
          capabilityScore: 100,
          isOptimalLevel: true,
          reason: "Level C BLS provides ideal vital signs telemetry and moderate trauma care.",
        };
      }
      if (level === "TYPE_B") {
        return {
          capabilityScore: 85,
          isOptimalLevel: true,
          reason: "Level B Patient Transport suited for stable moderate injury conveyance.",
        };
      }
      if (level === "TYPE_D") {
        return {
          capabilityScore: 80,
          isOptimalLevel: false,
          reason: "Level D ALS capable of handling moderate cases.",
        };
      }
      return {
        capabilityScore: 40,
        isOptimalLevel: false,
        reason: "Level A First Responder for immediate scene first-aid.",
      };

    case "LOW":
    default:
      if (level === "TYPE_A") {
        return {
          capabilityScore: 100,
          isOptimalLevel: true,
          reason: "Level A Medical First Responder ideal for rapid on-scene triage and minor first aid.",
        };
      }
      if (level === "TYPE_B") {
        return {
          capabilityScore: 95,
          isOptimalLevel: true,
          reason: "Level B Patient Transport equipped for stable non-urgent transport.",
        };
      }
      if (level === "TYPE_C") {
        return {
          capabilityScore: 85,
          isOptimalLevel: false,
          reason: "Level C BLS capable of minor case handling.",
        };
      }
      return {
        capabilityScore: 70,
        isOptimalLevel: false,
        reason: "Level D Mobile ICU available for general emergency response.",
      };
  }
}

/**
 * Finds and ranks available ambulances for an incident based on clinical capability and proximity/ETA.
 */
export async function matchAmbulancesForIncident(
  incident: Incident,
  availableOnly = true
): Promise<RankedAmbulance[]> {
  const allAmbulances = await getAmbulances();
  const sceneLat = incident.location.latitude;
  const sceneLng = incident.location.longitude;

  const candidates: RankedAmbulance[] = [];

  for (const amb of allAmbulances) {
    if (availableOnly && amb.status !== "AVAILABLE") {
      continue;
    }

    const ambLevel: AmbulanceLevel = amb.type || "TYPE_C";
    const { capabilityScore, isOptimalLevel, reason } = evaluateAmbulanceCapability(
      ambLevel,
      incident.severity
    );

    // Skip ambulances that have 0 capability score (e.g. bike first-responder for critical multi-trauma transport)
    if (capabilityScore <= 0) {
      continue;
    }

    const distanceKm = calculateHaversineDistance(
      amb.latitude,
      amb.longitude,
      sceneLat,
      sceneLng
    );
    const { etaMinutes, etaFormatted } = calculateETA(distanceKm);

    // Composite scoring: 60% capability match, 40% proximity (ETA)
    const proximityScore = Math.max(0, 100 - etaMinutes * 6);
    const matchScore = Math.round(capabilityScore * 0.6 + proximityScore * 0.4);

    candidates.push({
      ambulance: amb,
      distanceKm,
      etaMinutes,
      etaFormatted,
      capabilityScore,
      isOptimalLevel,
      matchScore,
      matchReason: reason,
    });
  }

  // Sort by highest match score (highest capability + closest ETA)
  candidates.sort((a, b) => b.matchScore - a.matchScore);
  return candidates;
}

/**
 * Recommends and ranks capable destination trauma centers for an incident.
 * Filters out full or incapable hospitals, and ranks suitable hospitals by proximity from the ambulance/incident.
 */
export async function recommendHospitalsForIncident(
  incident: Incident,
  originLocation?: { latitude: number; longitude: number }
): Promise<{
  recommendedHospital: RankedHospital | null;
  alternativeHospitals: RankedHospital[];
  filteredOutHospitals: FilteredHospital[];
}> {
  const allHospitals = await getHospitals();

  // Reference origin is the assigned ambulance's location if available, otherwise accident scene
  const refLat = originLocation ? originLocation.latitude : incident.location.latitude;
  const refLng = originLocation ? originLocation.longitude : incident.location.longitude;

  const suitable: RankedHospital[] = [];
  const filteredOut: FilteredHospital[] = [];

  for (const hosp of allHospitals) {
    // 1. Check availability status
    if (hosp.status === "FULL" || (hosp.availableBeds !== undefined && hosp.availableBeds <= 0)) {
      filteredOut.push({
        hospital: hosp,
        reason: "Emergency Department bed capacity is currently full (0 available beds).",
      });
      continue;
    }

    // 2. Check handled case severities
    const handledSeverities = hosp.handledSeverities || [
      "LOW",
      "MODERATE",
      "HIGH",
      "CRITICAL",
    ];

    if (!handledSeverities.includes(incident.severity)) {
      filteredOut.push({
        hospital: hosp,
        reason: `Facility is not accredited/equipped for ${incident.severity} acuity cases (Handled: ${handledSeverities.join(", ")}).`,
      });
      continue;
    }

    // 3. Proximity and ETA calculation
    const distanceKm = calculateHaversineDistance(
      refLat,
      refLng,
      hosp.latitude,
      hosp.longitude
    );
    const { etaMinutes, etaFormatted } = calculateETA(distanceKm);

    // Suitability scoring: Proximity + Available Beds + Emergency Status
    const proximityScore = Math.max(0, 100 - etaMinutes * 5);
    const bedScore = Math.min(25, (hosp.availableBeds || 1) * 2);
    const readinessScore =
      hosp.emergencyDepartmentStatus === "READY"
        ? 15
        : hosp.emergencyDepartmentStatus === "IDLE"
        ? 10
        : 5;

    const suitabilityScore = Math.round(proximityScore * 0.6 + bedScore + readinessScore);

    const recommendationReason = `Accredited for ${incident.severity} cases • ${distanceKm} km away (~${etaFormatted} min ETA) with ${hosp.availableBeds} ICU/trauma beds available.`;

    suitable.push({
      hospital: hosp,
      distanceKm,
      etaMinutes,
      etaFormatted,
      suitabilityScore,
      handlesSeverity: true,
      availableBeds: hosp.availableBeds || 0,
      isPrimaryRecommended: false,
      recommendationReason,
    });
  }

  // Sort suitable hospitals by suitability score (closest ETA + bed capacity)
  suitable.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  let recommendedHospital: RankedHospital | null = null;
  const alternativeHospitals: RankedHospital[] = [];

  if (suitable.length > 0) {
    suitable[0].isPrimaryRecommended = true;
    recommendedHospital = suitable[0];
    alternativeHospitals.push(...suitable.slice(1));
  }

  return {
    recommendedHospital,
    alternativeHospitals,
    filteredOutHospitals: filteredOut,
  };
}

/**
 * Runs a full assignment evaluation for an emergency incident without modifying database records.
 */
export async function evaluateEmergencyAssignment(
  incidentIdOrIncident: string | Incident
): Promise<AssignmentResult> {
  const incident =
    typeof incidentIdOrIncident === "string"
      ? await getIncidentById(incidentIdOrIncident)
      : incidentIdOrIncident;

  if (!incident) {
    throw new Error("Incident not found for assignment evaluation.");
  }

  // 1. Match suitable available ambulances
  const candidateAmbulances = await matchAmbulancesForIncident(incident, true);
  const matchedAmbulance = candidateAmbulances.length > 0 ? candidateAmbulances[0] : null;

  // 2. Recommend capable destination hospitals relative to the matched ambulance or accident location
  const originLocation = matchedAmbulance
    ? {
        latitude: matchedAmbulance.ambulance.latitude,
        longitude: matchedAmbulance.ambulance.longitude,
      }
    : incident.location;

  const {
    recommendedHospital,
    alternativeHospitals,
    filteredOutHospitals,
  } = await recommendHospitalsForIncident(incident, originLocation);

  const summary = matchedAmbulance
    ? `Assigned ${matchedAmbulance.ambulance.vehicleNumber} (${matchedAmbulance.ambulance.type || "BLS"}) • ETA: ~${matchedAmbulance.etaFormatted} min. Recommended destination: ${
        recommendedHospital ? recommendedHospital.hospital.name : "Pending"
      }.`
    : "No suitable available ambulance units currently online.";

  return {
    incident,
    matchedAmbulance,
    candidateAmbulances,
    recommendedHospital,
    alternativeHospitals,
    filteredOutHospitals,
    summary,
    autoCommitted: false,
  };
}

/**
 * Automatically executes and commits emergency ambulance assignment and hospital recommendation in the database.
 */
export async function autoAssignEmergency(
  incidentId: string,
  options?: {
    forceAmbulanceId?: string;
    forceHospitalId?: string;
  }
): Promise<AssignmentResult> {
  const evaluation = await evaluateEmergencyAssignment(incidentId);
  const { incident, matchedAmbulance, recommendedHospital } = evaluation;

  const targetAmbulance = options?.forceAmbulanceId
    ? (await getAmbulanceById(options.forceAmbulanceId)) || matchedAmbulance?.ambulance
    : matchedAmbulance?.ambulance;

  const targetHospital = options?.forceHospitalId
    ? (await getHospitalById(options.forceHospitalId)) || recommendedHospital?.hospital
    : recommendedHospital?.hospital;

  if (targetAmbulance) {
    // 1. Update incident with assigned ambulance and target hospital
    const updatedIncident = await updateIncident(incident.id, {
      status: "AMBULANCE_ASSIGNED",
      assignedAmbulanceId: targetAmbulance.vehicleNumber || targetAmbulance.id,
      targetHospitalId: targetHospital ? targetHospital.id : undefined,
    });

    // 2. Update ambulance status to RESPONDING
    await updateAmbulance(targetAmbulance.id, {
      status: "RESPONDING",
      currentIncidentId: incident.id,
      currentHospitalId: targetHospital ? targetHospital.id : undefined,
    });

    const finalIncident = updatedIncident || incident;

    // 3. Broadcast real-time notifications and network events
    broadcastEvent("ambulance:assigned", {
      incidentId: finalIncident.id,
      ambulanceId: targetAmbulance.vehicleNumber || targetAmbulance.id,
      incident: finalIncident,
    });

    broadcastEvent("incident:status_changed", {
      incidentId: finalIncident.id,
      status: "AMBULANCE_ASSIGNED",
      incident: finalIncident,
    });

    broadcastEvent("incident:updated", { incident: finalIncident });

    if (targetHospital) {
      broadcastEvent("hospital:alert", {
        incidentId: finalIncident.id,
        hospitalId: targetHospital.id,
        incident: finalIncident,
      });
    }

    broadcastEvent("notification:new", {
      id: `dispatch_${Date.now()}`,
      title: `Ambulance Dispatched for Incident #${finalIncident.incidentNumber}`,
      message: `${targetAmbulance.vehicleNumber} assigned. ETA: ~${
        matchedAmbulance?.etaFormatted || "04:00"
      } min. Destination: ${targetHospital ? targetHospital.name : "City Central"}.`,
      timestamp: new Date().toISOString(),
    });

    evaluation.incident = finalIncident;
    evaluation.autoCommitted = true;
  }

  return evaluation;
}
