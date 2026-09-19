import { UserRole } from "@/types/auth";

export const APP_NAME = "AIMLESS";
export const APP_TAGLINE = "Emergency response, coordinated in real time.";
export const APP_DESCRIPTION =
  "Report an accident, connect the nearest available ambulance, and coordinate hospital preparation through one response system.";

export const ROLE_REDIRECT_MAP: Record<UserRole, string> = {
  CITIZEN: "/citizen",
  AMBULANCE: "/ambulance",
  HOSPITAL: "/hospital",
  ADMIN: "/admin",
};

export const AUTH_COOKIE_NAME = "aimless_session";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds
