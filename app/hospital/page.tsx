"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { useSocketEvent } from "@/lib/socket";
import { Incident } from "@/types/incident";
import { Hospital } from "@/types/hospital";
import {
  Building2,
  Bell,
  Home,
  Truck,
  Activity,
  User,
  Users,
  FileText,
  Settings,
  HelpCircle,
  Clock,
  MapPin,
  ChevronRight,
  ChevronDown,
  Volume2,
  VolumeX,
  Gauge,
  Plus,
  Minus,
  Navigation,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  LogOut,
  Bed,
  HeartPulse,
  Stethoscope,
  ShieldCheck,
  Check,
} from "lucide-react";

export default function HospitalDashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "inbound" | "er" | "patients" | "staff" | "reports" | "profile" | "settings" | "help"
  >("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isAlertAcknowledged, setIsAlertAcknowledged] = useState(false);
  const [readinessStep, setReadinessStep] = useState<number>(2); // 1: Alert, 2: Preparing, 3: Ready, 4: Patient Arrived
  const [staffRequested, setStaffRequested] = useState(false);

  // Bed counts state
  const [bedCapacity, setBedCapacity] = useState({
    traumaAvailable: 2,
    traumaTotal: 6,
    icuAvailable: 3,
    icuTotal: 8,
    theatreAvailable: 1,
    theatreTotal: 4,
    staffOnDuty: 18,
  });

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIncidents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getIncidents("all");
      setIncidents(data);
    } catch {
      setIncidents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Real-time socket events
  useSocketEvent("hospital:alert", ({ incident }) => {
    setIsAlertAcknowledged(false);
    setReadinessStep(2);
    setIncidents((prev) => [incident, ...prev.filter((i) => i.id !== incident.id)]);
  });

  useSocketEvent("incident:updated", ({ incident }) => {
    setIncidents((prev) => prev.map((i) => (i.id === incident.id ? incident : i)));
  });

  const displayName = user?.name || "Dr. Meera Nair";
  const userInitial = displayName.replace("Dr. ", "").charAt(0).toUpperCase() || "D";

  return (
    <ProtectedRoute allowedRoles={["HOSPITAL", "ADMIN"]}>
      <div className="min-h-screen w-full bg-[#FAFAFA] text-[#141414] flex flex-col lg:flex-row antialiased">
        {/* ─────────────────────────────────────────────────────────────
            1. LEFT SIDEBAR (Desktop Fixed & Mobile Drawer)
        ───────────────────────────────────────────────────────────── */}
        <aside
          className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 xl:w-72 bg-[#FFFFFF] border-r border-neutral-200/70 p-6 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div>
            {/* Top Brand Logo */}
            <div className="flex items-center justify-between pb-7">
              <Link
                href="/"
                className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-1 text-[#141414] font-black text-xl tracking-[0.32em] uppercase">
                  <span>G</span>
                  <span className="inline-block font-sans font-normal scale-y-110">Λ</span>
                  <span>B</span>
                  <span>R</span>
                  <span>I</span>
                  <span>E</span>
                  <span>L</span>
                </div>
              </Link>
              <div className="hidden xl:block text-[8px] uppercase font-bold tracking-[0.25em] text-neutral-400 pl-2 border-l border-neutral-200">
                People Faster Safer
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="lg:hidden p-1 text-neutral-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Menu Links */}
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  activeTab === "dashboard"
                    ? "bg-[#111111] text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Home className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("inbound");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  activeTab === "inbound"
                    ? "bg-[#111111] text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Truck className="w-4 h-4 shrink-0" strokeWidth={2} />
                  <span>Incoming Ambulances</span>
                </div>
                <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">
                  1
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("er");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  activeTab === "er"
                    ? "bg-[#111111] text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Activity className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>Emergency Department</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("patients");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  activeTab === "patients"
                    ? "bg-[#111111] text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <User className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>Patients</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("staff");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  activeTab === "staff"
                    ? "bg-[#111111] text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Users className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>Staff & Resources</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("reports");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  activeTab === "reports"
                    ? "bg-[#111111] text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>Reports</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("profile");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  activeTab === "profile"
                    ? "bg-[#111111] text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>Hospital Profile</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("settings");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  activeTab === "settings"
                    ? "bg-[#111111] text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>Settings</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("help");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  activeTab === "help"
                    ? "bg-[#111111] text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <HelpCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>Help & Support</span>
              </button>
            </nav>
          </div>

          {/* Bottom Sidebar Mission Tagline */}
          <div className="pt-6 border-t border-neutral-100">
            <div className="w-8 h-[1.5px] bg-neutral-300 rounded-full mb-3" />
            <p className="text-[11px] text-neutral-400 font-normal leading-relaxed">
              Prepared<br />
              People Save Lives.
            </p>
            <div className="text-[11px] font-extrabold text-[#111111] tracking-[0.2em] uppercase mt-2">
              Gabriel
            </div>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
          />
        )}

        {/* ─────────────────────────────────────────────────────────────
            2. MAIN HOSPITAL DASHBOARD CONTENT
        ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Header Bar */}
          <header className="w-full bg-[#FFFFFF] border-b border-neutral-200/70 px-6 sm:px-8 lg:px-10 h-20 flex items-center justify-between sticky top-0 z-30">
            {/* Left Hospital Badge */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-full hover:bg-neutral-100 text-black"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-[#111111] leading-tight">
                    Lakeshore General Hospital
                  </h2>
                  <div className="text-[10px] text-neutral-400 font-medium">
                    Emergency Department
                  </div>
                </div>
              </div>
            </div>

            {/* Right Header Controls */}
            <div className="flex items-center gap-5 sm:gap-7">
              {/* Notification Bell */}
              <button
                className="relative p-2 rounded-full hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
                title="Emergency Alarms"
                onClick={() => alert("1 Active Inbound Ambulance: Ambulance A-01 (ETA 12 min).")}
              >
                <Bell className="w-4 h-4" strokeWidth={2} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-black ring-2 ring-white animate-pulse" />
              </button>

              {/* Staff Profile Chip */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-full hover:bg-neutral-100 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xs">
                    {userInitial}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-[#111111] leading-tight">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      Hospital Staff
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-neutral-200/80 py-2 z-50 animate-fade-in">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <div className="text-xs font-bold text-[#111111]">{displayName}</div>
                      <div className="text-[10px] text-neutral-400">Emergency Dept Officer</div>
                    </div>
                    <Link
                      href="/"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Home className="w-3.5 h-3.5 text-neutral-400" />
                      Home Landing
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Tagline */}
              <div className="hidden md:flex items-center gap-2 text-xs font-medium text-neutral-400 tracking-wide pl-3 border-l border-neutral-200">
                <span>A healthier, safer tomorrow. Together.</span>
                <div className="w-6 h-[1.5px] bg-neutral-300 rounded-full" />
              </div>
            </div>
          </header>

          {/* Main Dashboard Grid */}
          <main className="p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto flex flex-col gap-7">
            {/* ─────────────────────────────────────────────────────────
                1. INCOMING EMERGENCY PRIORITY ALARM BANNER (Black Hero Card)
            ───────────────────────────────────────────────────────── */}
            <div className="bg-[#0A0A0A] text-white rounded-[26px] p-6 sm:p-8 border border-neutral-900 shadow-lg relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              {/* Left Info & Icon */}
              <div className="flex items-center gap-5 z-10">
                {/* Pulsing Ambulance Icon Container */}
                <div className="relative w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full bg-white/5 animate-ping opacity-30" />
                  <Truck className="w-7 h-7 text-white animate-pulse" />
                </div>

                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-white/70 mb-1">
                    Incoming Emergency
                  </div>
                  <h3 className="text-2xl sm:text-[26px] font-black text-white tracking-tight leading-tight">
                    Ambulance A-01 is on the way
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 font-normal mt-0.5">
                    Prepare the emergency department.
                  </p>
                </div>
              </div>

              {/* Middle ETA Display */}
              <div className="flex items-baseline lg:flex-col lg:items-center gap-2 lg:gap-0 lg:px-8 lg:border-x lg:border-white/15 z-10">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                  ETA
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  12 min
                </div>
                <span className="text-[11px] text-neutral-400 font-medium">
                  Arriving at 10:42 AM
                </span>
              </div>

              {/* Right Acknowledge Button */}
              <div className="flex flex-col items-start lg:items-end gap-1.5 z-10 w-full sm:w-auto">
                <button
                  onClick={() => setIsAlertAcknowledged(!isAlertAcknowledged)}
                  className={`w-full sm:w-auto px-7 py-3.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer ${
                    isAlertAcknowledged
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-white hover:bg-neutral-100 text-[#111111]"
                  }`}
                >
                  {isAlertAcknowledged ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Alert Acknowledged</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 stroke-[2.5] animate-pulse" />
                      <span>Acknowledge Alert</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] text-neutral-400 self-center lg:self-end">
                  {isAlertAcknowledged ? "Siren Silenced" : "Siren Playing..."}
                </span>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────
                2. LIVE TRACKING & READINESS WORKFLOW (Split Row)
            ───────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 8 Cols: Live Tracking Card */}
              <div className="lg:col-span-8 bg-white rounded-[24px] border border-neutral-200/80 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-[#111111] tracking-tight">
                    Live Tracking
                  </h3>
                  <Link
                    href="/ambulance"
                    className="text-xs font-bold text-neutral-500 hover:text-black flex items-center gap-1"
                  >
                    <span>View Full Map</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  {/* Map Preview (7 Cols) */}
                  <div className="md:col-span-7 relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 select-none">
                    {/* Grayscale Map Route Texture */}
                    <div className="absolute inset-0 bg-[#F2F2F4] bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] [background-size:16px_16px] flex flex-col justify-between p-4">
                      {/* Origin Accident Location Tag */}
                      <div className="self-start bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-neutral-200 text-[10px] font-bold text-black shadow-xs flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-black" />
                        <div>
                          <div>Accident Location</div>
                          <div className="text-[9px] text-neutral-400 font-normal">MG Road, Kochi</div>
                        </div>
                      </div>

                      {/* Moving In-Transit Ambulance Indicator */}
                      <div className="self-center bg-black text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
                        <Truck className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">A-01</span>
                      </div>

                      {/* Destination Hospital Tag */}
                      <div className="self-end bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-neutral-200 text-[10px] font-bold text-black shadow-xs flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-black" />
                        <div>
                          <div>Lakeshore General Hospital</div>
                          <div className="text-[9px] text-neutral-400 font-normal">ETA: 12 min</div>
                        </div>
                      </div>
                    </div>

                    {/* Map Zoom Controls */}
                    <div className="absolute top-3 right-3 flex flex-col bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
                      <button className="p-1.5 hover:bg-neutral-100 text-neutral-700 border-b border-neutral-100">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 hover:bg-neutral-100 text-neutral-700">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Telemetry Metrics (5 Cols) */}
                  <div className="md:col-span-5 flex flex-col justify-between h-full py-1">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                        <span className="text-sm font-bold text-[#111111]">Ambulance A-01</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          En Route
                        </span>
                      </div>

                      <div className="flex flex-col gap-3 pt-3">
                        {/* Metric 1 */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-black shrink-0">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] text-neutral-400 font-medium">Distance</div>
                            <div className="text-xs font-bold text-[#111111]">4.8 km</div>
                          </div>
                        </div>

                        {/* Metric 2 */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-black shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] text-neutral-400 font-medium">Estimated Arrival</div>
                            <div className="text-xs font-bold text-[#111111]">12 min (10:42 AM)</div>
                          </div>
                        </div>

                        {/* Metric 3 */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-black shrink-0">
                            <Gauge className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] text-neutral-400 font-medium">Current Speed</div>
                            <div className="text-xs font-bold text-[#111111]">62 km/h</div>
                          </div>
                        </div>

                        {/* Metric 4 */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-black shrink-0">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] text-neutral-400 font-medium">Patient(s)</div>
                            <div className="text-xs font-bold text-[#111111]">2 (Critical)</div>
                          </div>
                        </div>

                        {/* Metric 5 */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-black shrink-0">
                            <Navigation className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] text-neutral-400 font-medium">From</div>
                            <div className="text-xs font-bold text-[#111111]">MG Road, Kochi</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 4 Cols: Emergency Department Readiness Card */}
              <div className="lg:col-span-4 bg-white rounded-[24px] border border-neutral-200/80 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-[#111111] tracking-tight">
                      Emergency Department Readiness
                    </h3>
                    <button
                      onClick={() => alert("Readiness protocol settings: Trauma team auto-page enabled.")}
                      className="text-xs font-bold text-neutral-500 hover:text-black flex items-center gap-1"
                    >
                      <span>Manage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 4-Stage Step Workflow */}
                  <div className="relative mb-8">
                    {/* Background Progress Line */}
                    <div className="absolute top-4 inset-x-4 h-[2px] bg-neutral-200 z-0" />
                    <div
                      className="absolute top-4 left-4 h-[2px] bg-[#111111] z-0 transition-all duration-300"
                      style={{
                        width: readinessStep === 1 ? "0%" : readinessStep === 2 ? "33%" : readinessStep === 3 ? "66%" : "100%",
                      }}
                    />

                    <div className="relative z-10 flex items-start justify-between text-center">
                      {/* Stage 1 */}
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                          ✓
                        </div>
                        <span className="text-[10px] font-bold text-[#111111] mt-1.5">
                          Alert<br />Received
                        </span>
                        <span className="text-[9px] text-neutral-400">10:28 AM</span>
                      </div>

                      {/* Stage 2 */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            readinessStep >= 2
                              ? "bg-[#111111] ring-4 ring-neutral-200 text-white"
                              : "bg-neutral-200 text-neutral-500"
                          }`}
                        >
                          2
                        </div>
                        <span className="text-[10px] font-bold text-[#111111] mt-1.5">
                          Preparing
                        </span>
                        <span className="text-[9px] text-neutral-400">In Progress</span>
                      </div>

                      {/* Stage 3 */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            readinessStep >= 3
                              ? "bg-[#111111] ring-4 ring-neutral-200 text-white"
                              : "bg-neutral-200 text-neutral-500"
                          }`}
                        >
                          3
                        </div>
                        <span className="text-[10px] font-medium text-neutral-600 mt-1.5">
                          Ready
                        </span>
                        <span className="text-[9px] text-neutral-400">—</span>
                      </div>

                      {/* Stage 4 */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            readinessStep >= 4
                              ? "bg-[#111111] ring-4 ring-neutral-200 text-white"
                              : "bg-neutral-200 text-neutral-500"
                          }`}
                        >
                          4
                        </div>
                        <span className="text-[10px] font-medium text-neutral-600 mt-1.5">
                          Patient<br />Arrived
                        </span>
                        <span className="text-[9px] text-neutral-400">—</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Readiness Action Buttons */}
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      if (readinessStep < 4) {
                        setReadinessStep((prev) => prev + 1);
                      } else {
                        setReadinessStep(1);
                      }
                    }}
                    className="w-full py-3.5 rounded-full bg-[#111111] hover:bg-[#262626] active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span>
                      {readinessStep === 2
                        ? "Mark as Ready"
                        : readinessStep === 3
                        ? "Confirm Patient Arrived"
                        : "Reset Protocol"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setStaffRequested(true);
                      alert("Additional on-call trauma surgeons and ICU nursing staff paged.");
                    }}
                    className={`w-full py-3.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      staffRequested
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                        : "bg-white hover:bg-neutral-50 border-neutral-300 text-[#111111]"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>{staffRequested ? "Additional Staff Paged" : "Request Additional Staff"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────
                3. BOTTOM GRID (Inbound Ambulances, ED Capacity, Updates & Photo)
            ───────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Card 1: Incoming Ambulances Queue (4 Cols) */}
              <div className="lg:col-span-4 bg-white rounded-[24px] border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-[#111111] tracking-tight">
                      Incoming Ambulances
                    </h3>
                    <button
                      onClick={() => alert("Viewing all active regional ambulance telemetry.")}
                      className="text-xs font-bold text-neutral-500 hover:text-black flex items-center gap-1"
                    >
                      <span>View All</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {/* Inbound 1 */}
                    <div className="p-3.5 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/70 flex items-center justify-between transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                        <div>
                          <div className="text-xs font-bold text-[#111111]">A-01</div>
                          <div className="text-[10px] text-neutral-400 truncate">From MG Road, Kochi</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#111111] bg-white px-2 py-0.5 rounded-full border border-neutral-200">
                          12 min
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black text-white text-[9px] font-bold">
                          CRITICAL
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                      </div>
                    </div>

                    {/* Inbound 2 */}
                    <div className="p-3.5 rounded-2xl bg-white hover:bg-neutral-50 border border-neutral-200/70 flex items-center justify-between transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-neutral-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-[#111111]">A-03</div>
                          <div className="text-[10px] text-neutral-400 truncate">From Edappally</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                          28 min
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 text-[9px] font-bold">
                          MODERATE
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                      </div>
                    </div>

                    {/* Inbound 3 */}
                    <div className="p-3.5 rounded-2xl bg-white hover:bg-neutral-50 border border-neutral-200/70 flex items-center justify-between transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-neutral-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-[#111111]">A-05</div>
                          <div className="text-[10px] text-neutral-400 truncate">From Kakkanad</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                          35 min
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[9px] font-bold">
                          STABLE
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Emergency Department Status & Beds (4 Cols) */}
              <div className="lg:col-span-4 bg-white rounded-[24px] border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-[#111111] tracking-tight">
                      Emergency Department Status
                    </h3>
                    <button
                      onClick={() => alert("Bed Management: 2 Trauma Beds, 3 ICU Beds, 1 OT currently available.")}
                      className="text-xs font-bold text-neutral-500 hover:text-black flex items-center gap-1"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 4 Capacity Blocks Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Trauma Beds */}
                    <div className="p-3.5 rounded-2xl bg-[#F8F8F9] border border-neutral-200/70">
                      <div className="flex items-center gap-2 text-neutral-500 text-xs font-semibold mb-1">
                        <Bed className="w-3.5 h-3.5" />
                        <span>Trauma Beds</span>
                      </div>
                      <div className="text-xl font-extrabold text-[#111111]">
                        {bedCapacity.traumaAvailable} / {bedCapacity.traumaTotal}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-medium">Available</span>
                    </div>

                    {/* ICU Beds */}
                    <div className="p-3.5 rounded-2xl bg-[#F8F8F9] border border-neutral-200/70">
                      <div className="flex items-center gap-2 text-neutral-500 text-xs font-semibold mb-1">
                        <HeartPulse className="w-3.5 h-3.5" />
                        <span>ICU Beds</span>
                      </div>
                      <div className="text-xl font-extrabold text-[#111111]">
                        {bedCapacity.icuAvailable} / {bedCapacity.icuTotal}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-medium">Available</span>
                    </div>

                    {/* Operating Theatres */}
                    <div className="p-3.5 rounded-2xl bg-[#F8F8F9] border border-neutral-200/70">
                      <div className="flex items-center gap-2 text-neutral-500 text-xs font-semibold mb-1">
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Operating Theatres</span>
                      </div>
                      <div className="text-xl font-extrabold text-[#111111]">
                        {bedCapacity.theatreAvailable} / {bedCapacity.theatreTotal}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-medium">Available</span>
                    </div>

                    {/* Staff On Duty */}
                    <div className="p-3.5 rounded-2xl bg-[#F8F8F9] border border-neutral-200/70">
                      <div className="flex items-center gap-2 text-neutral-500 text-xs font-semibold mb-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>Staff On Duty</span>
                      </div>
                      <div className="text-xl font-extrabold text-[#111111]">
                        {bedCapacity.staffOnDuty}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-medium">Active Members</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Recent Updates & Noir Trauma Hero Card (4 Cols) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {/* Recent Updates */}
                <div className="bg-white rounded-[24px] border border-neutral-200/80 p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                      Recent Updates
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-medium">Live Feed</span>
                  </div>

                  <div className="flex flex-col gap-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 shrink-0 mt-0.5">10:28 AM</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0 mt-1.5" />
                      <span className="text-[#111111] text-[11px] leading-tight">
                        Ambulance A-01 assigned to Lakeshore General Hospital
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 shrink-0 mt-0.5">10:27 AM</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 shrink-0 mt-1.5" />
                      <span className="text-neutral-600 text-[11px] leading-tight">
                        Ambulance A-01 en route (ETA 12 min)
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 shrink-0 mt-0.5">10:25 AM</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 shrink-0 mt-1.5" />
                      <span className="text-neutral-600 text-[11px] leading-tight">
                        New emergency reported at MG Road, Kochi
                      </span>
                    </div>
                  </div>
                </div>

                {/* Noir Photo Quote Card */}
                <div className="relative rounded-[24px] overflow-hidden bg-[#0A0A0A] text-white p-5 select-none min-h-[140px] flex flex-col justify-between">
                  <Image
                    src="/images/gabriel-hospital-hero.jpg"
                    alt="Hospital Trauma Corridor"
                    fill
                    sizes="(max-width: 1024px) 100vw, 350px"
                    className="object-cover object-center opacity-30 mix-blend-luminosity brightness-75 contrast-125"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                  <div className="relative z-10">
                    <h4 className="text-sm font-extrabold text-white leading-snug">
                      “Every second<br />prepares a life.”
                    </h4>
                  </div>

                  <div className="relative z-10 text-[10px] text-neutral-400 font-medium">
                    Ready teams. Stronger tomorrows.
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
