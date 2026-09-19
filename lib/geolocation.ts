"use client";

import { useState, useCallback } from "react";

export type GeolocationState =
  | "IDLE"
  | "REQUESTING"
  | "LOCATED"
  | "DENIED"
  | "UNAVAILABLE"
  | "ERROR";

export interface GeoLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>("IDLE");
  const [location, setLocation] = useState<GeoLocationData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState("UNAVAILABLE");
      setErrorMessage("Geolocation is not supported by your browser/device.");
      return;
    }

    setState("REQUESTING");
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const data: GeoLocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        };
        setLocation(data);
        setState("LOCATED");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setState("DENIED");
          setErrorMessage(
            "Location access was denied. Please allow location permissions in your browser to dispatch emergency services to your exact position."
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setState("UNAVAILABLE");
          setErrorMessage(
            "GPS location is currently unavailable. Please check your device location settings."
          );
        } else {
          setState("ERROR");
          setErrorMessage(
            error.message || "An unexpected error occurred while acquiring GPS coordinates."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  }, []);

  const resetLocation = useCallback(() => {
    setState("IDLE");
    setLocation(null);
    setErrorMessage(null);
  }, []);

  const setCustomLocation = useCallback((custom: GeoLocationData) => {
    setLocation(custom);
    setState("LOCATED");
    setErrorMessage(null);
  }, []);

  return {
    state,
    location,
    errorMessage,
    requestLocation,
    resetLocation,
    setCustomLocation,
  };
}
