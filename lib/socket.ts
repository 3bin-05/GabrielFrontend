"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Incident } from "@/types/incident";
import { Ambulance } from "@/types/ambulance";
import { Hospital } from "@/types/hospital";

export type SocketEventMap = {
  "incident:created": { incident: Incident };
  "incident:updated": { incident: Incident };
  "incident:status_changed": { incidentId: string; status: string; incident: Incident };
  "ambulance:assigned": { incidentId: string; ambulanceId: string; incident: Incident };
  "ambulance:location_updated": { ambulanceId: string; latitude: number; longitude: number; heading?: number; speed?: number };
  "ambulance:status_changed": { ambulanceId: string; status: string };
  "ambulance:eta_updated": { incidentId: string; eta: string; distanceKm?: number };
  "hospital:alert": { incidentId: string; hospitalId: string; incident: Incident };
  "hospital:status_updated": { hospitalId: string; readinessState: string; availableBeds?: number };
  "notification:new": { id: string; title: string; message: string; timestamp: string };
};

type EventName = keyof SocketEventMap;
type EventHandler<T extends EventName> = (data: SocketEventMap[T]) => void;

class RealtimeSocketManager {
  private eventSource: EventSource | null = null;
  private listeners = new Map<string, Set<(data: unknown) => void>>();
  private status: "connected" | "connecting" | "disconnected" | "error" = "disconnected";
  private statusListeners = new Set<(status: "connected" | "connecting" | "disconnected" | "error") => void>();
  private reconnectTimer: NodeJS.Timeout | null = null;

  connect() {
    if (typeof window === "undefined" || this.eventSource) return;

    this.setStatus("connecting");

    try {
      this.eventSource = new EventSource("/api/events");

      this.eventSource.onopen = () => {
        this.setStatus("connected");
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.eventSource.onerror = () => {
        this.setStatus("error");
        this.eventSource?.close();
        this.eventSource = null;

        // Auto reconnect after 3 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };

      // Register standard system event handlers
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
        "notification:new",
      ];

      standardEvents.forEach((eventName) => {
        this.eventSource?.addEventListener(eventName, (e: MessageEvent) => {
          try {
            const parsedData = JSON.parse(e.data);
            this.emitLocal(eventName, parsedData);
          } catch {
            // Ignore parse error
          }
        });
      });
    } catch {
      this.setStatus("error");
    }
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

    // Ensure connection is established
    if (!this.eventSource) {
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setStatus("disconnected");
  }
}

export const socketManager = new RealtimeSocketManager();

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
