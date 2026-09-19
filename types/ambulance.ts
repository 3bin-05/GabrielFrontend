export type AmbulanceStatus = "AVAILABLE" | "RESPONDING" | "TRANSPORTING" | "OFFLINE";

export interface Ambulance {
  id: string;
  vehicleNumber: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  status: AmbulanceStatus;
  currentIncidentId?: string;
  currentHospitalId?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
}

export interface AmbulanceLocationUpdate {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}
