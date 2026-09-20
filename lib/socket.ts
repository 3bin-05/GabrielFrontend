"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Incident } from "@/types/incident";
import { Ambulance } from "@/types/ambulance";
import { Hospital } from "@/types/hospital";

export interface RoutingStartPayload {
  incidentId: string;
  ambulanceId: string;
  stage: "TO_ACCIDENT" | "TO_HOSPITAL" | string;
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  distanceKm: number;
  etaMinutes: number;
  routeGeometry: [number, number][]; // [[lat, lng], ...]
  providerStatus?: string;
  timestamp?: string;
  hospitalId?: string;
  hospitalName?: string;
  hospitalCode?: string;
  availableBeds?: number;
  recommendationReason?: string;
  alternativeHospitals?: any[];
  stepsSummary?: string[];
}

export interface RoutingUpdatePayload {
  incidentId: string;
  ambulanceId: string;
  stage: "TO_ACCIDENT" | "TO_HOSPITAL" | string;
  destinationName?: string;
  currentLocation: { latitude: number; longitude: number };
  destination?: { latitude: number; longitude: number };
  distanceKm: number;
  etaMinutes: number;
  routeGeometry: [number, number][];
  providerStatus?: string;
  timestamp?: string;
  throttled?: boolean;
}

export interface RoutingReroutePayload {
  incidentId: string;
  ambulanceId: string;
  previousEtaMinutes: number;
  newEtaMinutes: number;
  savingsMinutes: number;
  distanceKm: number;
  routeGeometry: [number, number][];
  message: string;
  hospitalId?: string;
  hospitalName?: string;
}

export type SocketEventMap = {
  "incident:created": { incident: Incident };
  "incident:updated": { incident: Incident };
  "incident:status_changed": { incidentId: string; status: string; incident: Incident };
  "ambulance:assigned": { incidentId: string; ambulanceId: string; incident: Incident };
  "ambulance:location_updated": { ambulanceId: string; latitude: number; longitude: number; heading?: number; speed?: number; incidentId?: string };
  "ambulance:status_changed": { ambulanceId: string; status: string };
  "ambulance:eta_updated": { incidentId: string; eta: string; distanceKm?: number };
  "hospital:alert": { incidentId: string; hospitalId: string; incident: Incident };
  "hospital:status_updated": { hospitalId: string; readinessState: string; availableBeds?: number };
  "hospital:eta_updated": { incidentId: string; hospitalId?: string; ambulanceId?: string; eta: string; distanceKm?: number };
  "routing:start": RoutingStartPayload;
  "routing:update": RoutingUpdatePayload;
  "routing:reroute": RoutingReroutePayload;
  "routing:completed": { incidentId: string };
  "routing:error": { error: string; context?: string };
  "routing:request": {
    incidentId: string;
    stage?: number;
    origin?: { latitude: number; longitude: number } | { lat: number; lng: number };
    destination?: { latitude: number; longitude: number };
    hospitalId?: string;
    hospitalName?: string;
  };
  "notification:new": { id: string; title: string; message: string; timestamp: string };
};

type EventName = keyof SocketEventMap;
type EventHandler<T extends EventName> = (data: SocketEventMap[T]) => void;

class RealtimeSocketManager {
  private socket: Socket | null = null;
  private eventSource: EventSource | null = null;
  private listeners = new Map<string, Set<(data: unknown) => void>>();
  private status: "connected" | "connecting" | "disconnected" | "error" = "disconnected";
  private statusListeners = new Set<(status: "connected" | "connecting" | "disconnected" | "error") => void>();

  connect() {
    if (typeof window === "undefined") return;
    if (this.socket && this.socket.connected) return;

    this.setStatus("connecting");

    // 1. Connect via Socket.IO (Port 4000 or custom host)
    const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:4000";

    try {
      this.socket = io(socketServerUrl, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 5000,
      });

      this.socket.on("connect", () => {
        this.setStatus("connected");
      });

      this.socket.on("disconnect", () => {
        this.setStatus("disconnected");
      });

      this.socket.on("connect_error", () => {
        // Fallback to SSE endpoint if standalone Socket.IO server is not started yet
        this.fallbackToSSE();
      });

      // Register all standard events from Socket.IO server
      const standardEvents: EventName[] = [
        "incident:created",
        "incident:updated",
        "incident:status_changed",
        "ambulance:assigned",
        "ambulance:location_updated",
        "ambulance:status_changed",
        "ambulance:eta_updated",
        "hospital:alert",
        "hospital:status_updated",
        "hospital:eta_updated",
        "routing:start",
        "routing:update",
        "routing:reroute",
        "routing:completed",
        "routing:error",
        "notification:new",
      ];

      standardEvents.forEach((eventName) => {
        this.socket?.on(eventName, (data: unknown) => {
          this.emitLocal(eventName, data);
        });
      });
    } catch {
      this.fallbackToSSE();
    }
  }

  private fallbackToSSE() {
    if (this.eventSource || typeof window === "undefined") return;

    try {
      this.eventSource = new EventSource("/api/events");

      this.eventSource.onopen = () => {
        this.setStatus("connected");
      };

      this.eventSource.onerror = () => {
        this.setStatus("error");
      };

      const standardEvents: EventName[] = [
        "incident:created",
        "incident:updated",
        "incident:status_changed",
        "ambulance:assigned",
        "ambulance:location_updated",
        "ambulance:status_changed",
        "ambulance:eta_updated",
        "hospital:alert",
        "hospital:status_updated",
        "hospital:eta_updated",
        "routing:start",
        "routing:update",
        "routing:reroute",
        "routing:completed",
        "routing:error",
        "notification:new",
      ];

      standardEvents.forEach((eventName) => {
        this.eventSource?.addEventListener(eventName, (e: MessageEvent) => {
          try {
            const parsedData = JSON.parse(e.data);
            this.emitLocal(eventName, parsedData);
          } catch {}
        });
      });
    } catch {
      this.setStatus("error");
    }
  }

  emit<T extends EventName>(event: T, data: SocketEventMap[T]) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
    // Also emit locally for immediate UI reactivity
    this.emitLocal(event, data);
  }

  private setStatus(newStatus: "connected" | "connecting" | "disconnected" | "error") {
    this.status = newStatus;
    for (const listener of this.statusListeners) {
      listener(newStatus);
    }
  }

  getStatus() {
    return this.status;
  }

  onStatusChange(listener: (status: "connected" | "connecting" | "disconnected" | "error") => void) {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(handler as (data: unknown) => void);

    if (!this.socket && !this.eventSource) {
      this.connect();
    }

    return () => {
      set.delete(handler as (data: unknown) => void);
    };
  }

  private emitLocal(event: string, data: unknown) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(data);
      } catch (err) {
        console.error(`[Socket Handler Error for ${event}]:`, err);
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setStatus("disconnected");
  }
}

export const socketManager = new RealtimeSocketManager();

export function emitSocketEvent<T extends EventName>(event: T, data: SocketEventMap[T]) {
  socketManager.emit(event, data);
}

// React Hook for Socket Connection & Status
export function useSocket() {
  const [status, setStatus] = useState<"connected" | "connecting" | "disconnected" | "error">(
    socketManager.getStatus()
  );

  useEffect(() => {
    socketManager.connect();
    const unsubscribe = socketManager.onStatusChange(setStatus);
    return () => {
      unsubscribe();
    };
  }, []);

  return { status };
}

// React Hook for Subscribing to specific Socket Events
export function useSocketEvent<T extends EventName>(
  event: T,
  handler: EventHandler<T>
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (data: SocketEventMap[T]) => {
      if (savedHandler.current) {
        savedHandler.current(data);
      }
    };

    const unsubscribe = socketManager.on(event, listener);
    return () => {
      unsubscribe();
    };
  }, [event]);
}
