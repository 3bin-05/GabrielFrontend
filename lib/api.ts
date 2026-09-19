import { AuthResponse, LoginPayload, RegisterPayload, User, UserRole } from "@/types/auth";
import { Incident, IncidentSeverity, IncidentStatus } from "@/types/incident";
import { Ambulance, AmbulanceStatus } from "@/types/ambulance";
import { Hospital, HospitalReadinessState, HospitalStatus } from "@/types/hospital";

export interface CreateAccidentPayload {
  latitude: number;
  longitude: number;
  locationAccuracy?: number;
  severity: IncidentSeverity;
  victimCount: number;
  description?: string;
  phone?: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: "same-origin",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || data.message || `Request failed with status ${response.status}`
      );
    }

    return data as T;
  }

  // Auth endpoints
  async login(payload: LoginPayload): Promise<{ user: User; message: string }> {
    return this.request<{ user: User; message: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async register(
    payload: RegisterPayload
  ): Promise<{ user: User; message: string }> {
    return this.request<{ user: User; message: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async logout(): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/auth/logout", {
      method: "POST",
    });
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await this.request<{ user: User | null }>("/api/auth/me", {
        method: "GET",
      });
      return res.user;
    } catch {
      return null;
    }
  }

  // Emergency / Accident reporting
  async reportAccident(
    payload: CreateAccidentPayload
  ): Promise<{ incident: Incident; message: string }> {
    return this.request<{ incident: Incident; message: string }>(
      "/api/accidents",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  // Incidents
  async getIncidents(scope: "me" | "all" = "all"): Promise<Incident[]> {
    const res = await this.request<{ incidents: Incident[] }>(
      `/api/incidents?scope=${scope}`,
      { method: "GET" }
    );
    return res.incidents || [];
  }

  async getIncidentById(id: string): Promise<Incident> {
    const res = await this.request<{ incident: Incident }>(
      `/api/incidents/${id}`,
      { method: "GET" }
    );
    return res.incident;
  }

  async updateIncidentStatus(
    id: string,
    updates: {
      status?: IncidentStatus;
      assignedAmbulanceId?: string;
      targetHospitalId?: string;
    }
  ): Promise<{ incident: Incident; message: string }> {
    return this.request<{ incident: Incident; message: string }>(
      `/api/incidents/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      }
    );
  }

  // Hospitals
  async getHospitals(): Promise<Hospital[]> {
    const res = await this.request<{ hospitals: Hospital[] }>("/api/hospitals", {
      method: "GET",
    });
    return res.hospitals || [];
  }

  async updateHospital(
    id: string,
    updates: {
      status?: HospitalStatus;
      availableBeds?: number;
      emergencyDepartmentStatus?: HospitalReadinessState;
    }
  ): Promise<{ hospital: Hospital; message: string }> {
    return this.request<{ hospital: Hospital; message: string }>(
      `/api/hospitals/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      }
    );
  }

  // Ambulances
  async getAmbulances(): Promise<Ambulance[]> {
    const res = await this.request<{ ambulances: Ambulance[] }>(
      "/api/ambulances",
      { method: "GET" }
    );
    return res.ambulances || [];
  }

  async updateAmbulance(
    id: string,
    updates: {
      status?: AmbulanceStatus;
      currentIncidentId?: string | null;
      currentHospitalId?: string | null;
      latitude?: number;
      longitude?: number;
      speed?: number;
      heading?: number;
    }
  ): Promise<{ ambulance: Ambulance; message: string }> {
    return this.request<{ ambulance: Ambulance; message: string }>(
      `/api/ambulances/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      }
    );
  }

  // Users (Admin Only)
  async getUsers(): Promise<User[]> {
    const res = await this.request<{ users: User[] }>("/api/users", {
      method: "GET",
    });
    return res.users || [];
  }

  async provisionUser(payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
  }): Promise<{ user: User; message: string }> {
    return this.request<{ user: User; message: string }>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiClient();
