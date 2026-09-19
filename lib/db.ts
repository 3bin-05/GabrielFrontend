import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { User, UserRole } from "@/types/auth";
import { Incident, IncidentSeverity, IncidentStatus } from "@/types/incident";
import { Ambulance, AmbulanceStatus } from "@/types/ambulance";
import { Hospital, HospitalReadinessState, HospitalStatus } from "@/types/hospital";

export interface DbUser extends User {
  passwordHash: string;
}

// PostgreSQL Connection Pool
let pool: Pool | null = null;
let isPgConnected = false;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

// In-memory fallback stores
const globalStore = global as unknown as {
  __aimless_users?: Map<string, DbUser>;
  __aimless_incidents?: Map<string, Incident>;
  __aimless_ambulances?: Map<string, Ambulance>;
  __aimless_hospitals?: Map<string, Hospital>;
  __aimless_incident_seq?: number;
  __aimless_initialized?: boolean;
};

if (!globalStore.__aimless_users) {
  globalStore.__aimless_users = new Map<string, DbUser>();
}
if (!globalStore.__aimless_incidents) {
  globalStore.__aimless_incidents = new Map<string, Incident>();
}
if (!globalStore.__aimless_ambulances) {
  globalStore.__aimless_ambulances = new Map<string, Ambulance>();
}
if (!globalStore.__aimless_hospitals) {
  globalStore.__aimless_hospitals = new Map<string, Hospital>();
}
if (globalStore.__aimless_incident_seq === undefined) {
  globalStore.__aimless_incident_seq = 1000;
}

export async function initializeDatabase(): Promise<void> {
  if (globalStore.__aimless_initialized) return;

  const pg = getPool();
  if (pg) {
    try {
      // Create schema in PostgreSQL
      await pg.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(50),
          role VARCHAR(50) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS incidents (
          id VARCHAR(100) PRIMARY KEY,
          incident_number VARCHAR(50) UNIQUE NOT NULL,
          reporter_id VARCHAR(100),
          reporter_phone VARCHAR(50),
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          accuracy DOUBLE PRECISION,
          address TEXT,
          severity VARCHAR(50) NOT NULL,
          victim_count INTEGER NOT NULL DEFAULT 1,
          description TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'REPORTED',
          assigned_ambulance_id VARCHAR(100),
          target_hospital_id VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ambulances (
          id VARCHAR(100) PRIMARY KEY,
          vehicle_number VARCHAR(50) NOT NULL,
          driver_id VARCHAR(100) NOT NULL,
          driver_name VARCHAR(255) NOT NULL,
          driver_phone VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
          current_incident_id VARCHAR(100),
          current_hospital_id VARCHAR(100),
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          heading DOUBLE PRECISION,
          speed DOUBLE PRECISION,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS hospitals (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(50) NOT NULL,
          address TEXT NOT NULL,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          phone VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
          available_beds INTEGER NOT NULL DEFAULT 12,
          emergency_status VARCHAR(50) NOT NULL DEFAULT 'IDLE',
          handled_severities TEXT[] DEFAULT '{"LOW","MODERATE","HIGH","CRITICAL"}'
        );

        -- Safe column migrations for existing instances
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS handled_severities TEXT[] DEFAULT '{"LOW","MODERATE","HIGH","CRITICAL"}';
      `);

      isPgConnected = true;
      console.log("[Database] Connected successfully to Neon PostgreSQL instance.");

      // Seed server-provisioned demo accounts into PostgreSQL
      const seedAccounts = [
        {
          id: "usr_admin_001",
          name: "Emergency Command Admin",
          email: "admin@aimless.local",
          phone: "+15550000001",
          role: "ADMIN" as UserRole,
          rawPassword: "adminPassword123!",
        },
        {
          id: "usr_amb_001",
          name: "Unit A-01 Driver (John Miller)",
          email: "ambulance01@aimless.local",
          phone: "+15550000002",
          role: "AMBULANCE" as UserRole,
          rawPassword: "ambulancePassword123!",
        },
        {
          id: "usr_hosp_001",
          name: "City Central Emergency Dept",
          email: "hospital01@aimless.local",
          phone: "+15550000003",
          role: "HOSPITAL" as UserRole,
          rawPassword: "hospitalPassword123!",
        },
        {
          id: "usr_cit_001",
          name: "Jane Doe (Citizen)",
          email: "citizen@aimless.local",
          phone: "+15550000004",
          role: "CITIZEN" as UserRole,
          rawPassword: "citizenPassword123!",
        },
      ];

      for (const acc of seedAccounts) {
        const existing = await pg.query(
          "SELECT id FROM users WHERE email = $1",
          [acc.email.toLowerCase()]
        );
        if (existing.rows.length === 0) {
          const hash = await bcrypt.hash(acc.rawPassword, 10);
          await pg.query(
            `INSERT INTO users (id, name, email, phone, role, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [acc.id, acc.name, acc.email.toLowerCase(), acc.phone, acc.role, hash]
          );
        }
      }

      // Seed hospitals
      const defaultHospitals = [
        {
          id: "hosp_001",
          name: "City Central Emergency & Trauma Center",
          code: "CCET-01",
          address: "100 Medical Center Way, Downtown",
          latitude: 8.9182,
          longitude: 76.6354,
          phone: "+1-555-911-0100",
          status: "AVAILABLE" as HospitalStatus,
          availableBeds: 14,
          handledSeverities: ["LOW", "MODERATE", "HIGH", "CRITICAL"] as IncidentSeverity[],
        },
        {
          id: "hosp_002",
          name: "Metro Memorial Trauma Hospital",
          code: "MMTH-02",
          address: "450 Health Parkway, North District",
          latitude: 8.9321,
          longitude: 76.6410,
          phone: "+1-555-911-0200",
          status: "AVAILABLE" as HospitalStatus,
          availableBeds: 8,
          handledSeverities: ["MODERATE", "HIGH", "CRITICAL"] as IncidentSeverity[],
        },
        {
          id: "hosp_003",
          name: "St. Jude Critical Care Pavilion",
          code: "SJCC-03",
          address: "780 Samaritan Ave, West Sector",
          latitude: 8.9054,
          longitude: 76.6190,
          phone: "+1-555-911-0300",
          status: "AVAILABLE" as HospitalStatus,
          availableBeds: 5,
          handledSeverities: ["HIGH", "CRITICAL"] as IncidentSeverity[],
        },
      ];

      for (const h of defaultHospitals) {
        const existing = await pg.query("SELECT id FROM hospitals WHERE id = $1", [h.id]);
        if (existing.rows.length === 0) {
          await pg.query(
            `INSERT INTO hospitals (id, name, code, address, latitude, longitude, phone, status, available_beds, handled_severities)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [h.id, h.name, h.code, h.address, h.latitude, h.longitude, h.phone, h.status, h.availableBeds, h.handledSeverities]
          );
        }
      }

      // Seed ambulance units
      const defaultAmbulances = [
        {
          id: "amb_unit_001",
          vehicleNumber: "Unit A-01 (Rapid Medic)",
          driverId: "usr_amb_001",
          driverName: "John Miller (Driver)",
          driverPhone: "+15550000002",
          status: "AVAILABLE",
          latitude: 8.9150,
          longitude: 76.6330,
          heading: 90,
          speed: 0,
        },
        {
          id: "amb_unit_002",
          vehicleNumber: "Unit A-02 (Heavy Trauma)",
          driverId: "usr_amb_002",
          driverName: "Sarah Jenkins (Driver)",
          driverPhone: "+15550000005",
          status: "AVAILABLE",
          latitude: 8.9240,
          longitude: 76.6450,
          heading: 180,
          speed: 0,
        },
      ];

      for (const amb of defaultAmbulances) {
        const existingAmb = await pg.query("SELECT id FROM ambulances WHERE id = $1", [amb.id]);
        if (existingAmb.rows.length === 0) {
          await pg.query(
            `INSERT INTO ambulances (id, vehicle_number, driver_id, driver_name, driver_phone, status, latitude, longitude, heading, speed)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              amb.id,
              amb.vehicleNumber,
              amb.driverId,
              amb.driverName,
              amb.driverPhone,
              amb.status,
              amb.latitude,
              amb.longitude,
              amb.heading,
              amb.speed,
            ]
          );
        }
      }

      globalStore.__aimless_initialized = true;
      return;
    } catch (err) {
      console.warn("[Database] PostgreSQL connection issue. Falling back to in-memory store.", err);
      isPgConnected = false;
    }
  }

  // Fallback in-memory seeding
  const users = globalStore.__aimless_users!;
  const seedAccounts: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    rawPassword: string;
  }> = [
    {
      id: "usr_admin_001",
      name: "Emergency Command Admin",
      email: "admin@aimless.local",
      phone: "+15550000001",
      role: "ADMIN",
      rawPassword: "adminPassword123!",
    },
    {
      id: "usr_amb_001",
      name: "Unit A-01 Driver (John Miller)",
      email: "ambulance01@aimless.local",
      phone: "+15550000002",
      role: "AMBULANCE",
      rawPassword: "ambulancePassword123!",
    },
    {
      id: "usr_hosp_001",
      name: "City Central Emergency Dept",
      email: "hospital01@aimless.local",
      phone: "+15550000003",
      role: "HOSPITAL",
      rawPassword: "hospitalPassword123!",
    },
    {
      id: "usr_cit_001",
      name: "Jane Doe (Citizen)",
      email: "citizen@aimless.local",
      phone: "+15550000004",
      role: "CITIZEN",
      rawPassword: "citizenPassword123!",
    },
  ];

  for (const acc of seedAccounts) {
    if (!users.has(acc.email.toLowerCase())) {
      const passwordHash = await bcrypt.hash(acc.rawPassword, 10);
      users.set(acc.email.toLowerCase(), {
        id: acc.id,
        name: acc.name,
        email: acc.email.toLowerCase(),
        phone: acc.phone,
        role: acc.role,
        passwordHash,
        createdAt: new Date().toISOString(),
      });
    }
  }

  globalStore.__aimless_ambulances?.set("amb_unit_001", {
    id: "amb_unit_001",
    vehicleNumber: "Unit A-01 (Rapid Medic)",
    driverId: "usr_amb_001",
    driverName: "John Miller (Driver)",
    driverPhone: "+15550000002",
    status: "AVAILABLE",
    latitude: 8.9150,
    longitude: 76.6330,
    heading: 90,
    speed: 0,
    updatedAt: new Date().toISOString(),
  });

  globalStore.__aimless_hospitals?.set("hosp_001", {
    id: "hosp_001",
    name: "City Central Emergency & Trauma Center",
    code: "CCET-01",
    address: "100 Medical Center Way, Downtown",
    latitude: 8.9182,
    longitude: 76.6354,
    phone: "+1-555-911-0100",
    status: "AVAILABLE",
    availableBeds: 14,
    emergencyDepartmentStatus: "IDLE",
    handledSeverities: ["LOW", "MODERATE", "HIGH", "CRITICAL"],
  });

  globalStore.__aimless_initialized = true;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  await initializeDatabase();
  const normalized = email.trim().toLowerCase();

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      const res = await pg.query(
        "SELECT id, name, email, phone, role, password_hash, created_at FROM users WHERE email = $1",
        [normalized]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          role: row.role as UserRole,
          passwordHash: row.password_hash,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        };
      }
      return null;
    } catch (err) {
      console.error("[Database] Error querying user by email in PostgreSQL:", err);
    }
  }

  return globalStore.__aimless_users?.get(normalized) || null;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  await initializeDatabase();

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      const res = await pg.query(
        "SELECT id, name, email, phone, role, password_hash, created_at FROM users WHERE id = $1",
        [id]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          role: row.role as UserRole,
          passwordHash: row.password_hash,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        };
      }
      return null;
    } catch (err) {
      console.error("[Database] Error querying user by ID in PostgreSQL:", err);
    }
  }

  for (const user of globalStore.__aimless_users!.values()) {
    if (user.id === id) return user;
  }
  return null;
}

export async function getAllUsers(): Promise<User[]> {
  await initializeDatabase();

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      const res = await pg.query(
        "SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC"
      );
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        role: r.role as UserRole,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      }));
    } catch (err) {
      console.error("[Database] Error fetching all users:", err);
    }
  }

  return Array.from(globalStore.__aimless_users?.values() || []).map(
    ({ passwordHash: _, ...u }) => u
  );
}

export async function createUser(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
}): Promise<User> {
  await initializeDatabase();
  const normalized = data.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(data.password, 10);
  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const role: UserRole =
    data.role && ["CITIZEN", "AMBULANCE", "HOSPITAL", "ADMIN"].includes(data.role)
      ? data.role
      : "CITIZEN";

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      const existing = await pg.query(
        "SELECT id FROM users WHERE email = $1",
        [normalized]
      );
      if (existing.rows.length > 0) {
        throw new Error("An account with this email address already exists.");
      }

      await pg.query(
        `INSERT INTO users (id, name, email, phone, role, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, data.name.trim(), normalized, data.phone.trim(), role, passwordHash]
      );

      return {
        id,
        name: data.name.trim(),
        email: normalized,
        phone: data.phone.trim(),
        role,
        createdAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("already exists")) {
        throw err;
      }
      console.error("[Database] Error inserting user into PostgreSQL:", err);
      throw new Error("Database insertion error: " + (err instanceof Error ? err.message : "Unknown"));
    }
  }

  if (globalStore.__aimless_users?.has(normalized)) {
    throw new Error("An account with this email address already exists.");
  }

  const dbUser: DbUser = {
    id,
    name: data.name.trim(),
    email: normalized,
    phone: data.phone.trim(),
    role,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  globalStore.__aimless_users!.set(normalized, dbUser);

  const { passwordHash: _, ...publicUser } = dbUser;
  return publicUser;
}

export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<User | null> {
  await initializeDatabase();
  const user = await getUserByEmail(email);
  if (!user) return null;

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) return null;

  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}

// ==========================================
// Incident Database Operations (PostgreSQL)
// ==========================================

export async function createIncident(data: {
  latitude: number;
  longitude: number;
  locationAccuracy?: number;
  address?: string;
  severity: IncidentSeverity;
  victimCount: number;
  description?: string;
  reporterId?: string;
  reporterPhone?: string;
}): Promise<Incident> {
  await initializeDatabase();

  const id = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const seq = (globalStore.__aimless_incident_seq = (globalStore.__aimless_incident_seq || 1000) + 1);
  const incidentNumber = `ER-${seq}`;
  const now = new Date().toISOString();

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      await pg.query(
        `INSERT INTO incidents (
          id, incident_number, reporter_id, reporter_phone, latitude, longitude,
          accuracy, address, severity, victim_count, description, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          id,
          incidentNumber,
          data.reporterId || null,
          data.reporterPhone || null,
          data.latitude,
          data.longitude,
          data.locationAccuracy || null,
          data.address || null,
          data.severity,
          data.victimCount,
          data.description || null,
          "REPORTED",
          now,
          now,
        ]
      );

      return {
        id,
        incidentNumber,
        reporterId: data.reporterId,
        reporterPhone: data.reporterPhone,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.locationAccuracy,
          address: data.address,
        },
        severity: data.severity,
        victimCount: data.victimCount,
        description: data.description,
        status: "REPORTED",
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      console.error("[Database] PostgreSQL error inserting incident:", err);
    }
  }

  // In-memory fallback
  const incident: Incident = {
    id,
    incidentNumber,
    reporterId: data.reporterId,
    reporterPhone: data.reporterPhone,
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.locationAccuracy,
      address: data.address,
    },
    severity: data.severity,
    victimCount: data.victimCount,
    description: data.description,
    status: "REPORTED",
    createdAt: now,
    updatedAt: now,
  };

  globalStore.__aimless_incidents!.set(id, incident);
  return incident;
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  await initializeDatabase();

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      const res = await pg.query(
        `SELECT id, incident_number, reporter_id, reporter_phone, latitude, longitude,
                accuracy, address, severity, victim_count, description, status,
                assigned_ambulance_id, target_hospital_id, created_at, updated_at
         FROM incidents WHERE id = $1 OR incident_number = $1`,
        [id]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          incidentNumber: r.incident_number,
          reporterId: r.reporter_id || undefined,
          reporterPhone: r.reporter_phone || undefined,
          location: {
            latitude: r.latitude,
            longitude: r.longitude,
            accuracy: r.accuracy || undefined,
            address: r.address || undefined,
          },
          severity: r.severity as IncidentSeverity,
          victimCount: r.victim_count,
          description: r.description || undefined,
          status: r.status as IncidentStatus,
          assignedAmbulanceId: r.assigned_ambulance_id || undefined,
          targetHospitalId: r.target_hospital_id || undefined,
          createdAt: new Date(r.created_at).toISOString(),
          updatedAt: new Date(r.updated_at).toISOString(),
        };
      }
      return null;
    } catch (err) {
      console.error("[Database] PostgreSQL error fetching incident:", err);
    }
  }

  return (
    globalStore.__aimless_incidents?.get(id) ||
    Array.from(globalStore.__aimless_incidents?.values() || []).find(
      (inc) => inc.incidentNumber === id
    ) ||
    null
  );
}

export async function getIncidents(options?: {
  reporterId?: string;
  status?: IncidentStatus;
  limit?: number;
}): Promise<Incident[]> {
  await initializeDatabase();

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      let query = `
        SELECT id, incident_number, reporter_id, reporter_phone, latitude, longitude,
               accuracy, address, severity, victim_count, description, status,
               assigned_ambulance_id, target_hospital_id, created_at, updated_at
        FROM incidents
      `;
      const params: unknown[] = [];

      if (options?.reporterId) {
        params.push(options.reporterId);
        query += ` WHERE reporter_id = $${params.length}`;
      } else if (options?.status) {
        params.push(options.status);
        query += ` WHERE status = $${params.length}`;
      }

      query += ` ORDER BY created_at DESC LIMIT ${options?.limit || 50}`;

      const res = await pg.query(query, params);
      return res.rows.map((r) => ({
        id: r.id,
        incidentNumber: r.incident_number,
        reporterId: r.reporter_id || undefined,
        reporterPhone: r.reporter_phone || undefined,
        location: {
          latitude: r.latitude,
          longitude: r.longitude,
          accuracy: r.accuracy || undefined,
          address: r.address || undefined,
        },
        severity: r.severity as IncidentSeverity,
        victimCount: r.victim_count,
        description: r.description || undefined,
        status: r.status as IncidentStatus,
        assignedAmbulanceId: r.assigned_ambulance_id || undefined,
        targetHospitalId: r.target_hospital_id || undefined,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    } catch (err) {
      console.error("[Database] PostgreSQL error fetching incidents:", err);
    }
  }

  let list = Array.from(globalStore.__aimless_incidents?.values() || []);
  if (options?.reporterId) {
    list = list.filter((i) => i.reporterId === options.reporterId);
  }
  if (options?.status) {
    list = list.filter((i) => i.status === options.status);
  }
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateIncident(
  id: string,
  updates: {
    status?: IncidentStatus;
    assignedAmbulanceId?: string;
    targetHospitalId?: string;
  }
): Promise<Incident | null> {
  await initializeDatabase();
  const now = new Date().toISOString();

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      const sets: string[] = ["updated_at = NOW()"];
      const params: unknown[] = [id];

      if (updates.status) {
        params.push(updates.status);
        sets.push(`status = $${params.length}`);
      }
      if (updates.assignedAmbulanceId !== undefined) {
        params.push(updates.assignedAmbulanceId);
        sets.push(`assigned_ambulance_id = $${params.length}`);
      }
      if (updates.targetHospitalId !== undefined) {
        params.push(updates.targetHospitalId);
        sets.push(`target_hospital_id = $${params.length}`);
      }

      await pg.query(
        `UPDATE incidents SET ${sets.join(", ")} WHERE id = $1 OR incident_number = $1`,
        params
      );

      return await getIncidentById(id);
    } catch (err) {
      console.error("[Database] PostgreSQL error updating incident:", err);
    }
  }

  // In-memory fallback
  const inc =
    globalStore.__aimless_incidents?.get(id) ||
    Array.from(globalStore.__aimless_incidents?.values() || []).find(
      (i) => i.incidentNumber === id
    );
  if (!inc) return null;

  if (updates.status) inc.status = updates.status;
  if (updates.assignedAmbulanceId !== undefined)
    inc.assignedAmbulanceId = updates.assignedAmbulanceId;
  if (updates.targetHospitalId !== undefined)
    inc.targetHospitalId = updates.targetHospitalId;
  inc.updatedAt = now;

  return inc;
}

// ==========================================
// Ambulance Operations
// ==========================================

export async function getAmbulances(): Promise<Ambulance[]> {
  await initializeDatabase();

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      const res = await pg.query(
        `SELECT id, vehicle_number, driver_id, driver_name, driver_phone, status,
                current_incident_id, current_hospital_id, latitude, longitude, heading, speed, updated_at
         FROM ambulances`
      );
      return res.rows.map((r) => ({
        id: r.id,
        vehicleNumber: r.vehicle_number,
        driverId: r.driver_id,
        driverName: r.driver_name,
        driverPhone: r.driver_phone,
        status: r.status as AmbulanceStatus,
        currentIncidentId: r.current_incident_id || undefined,
        currentHospitalId: r.current_hospital_id || undefined,
        latitude: r.latitude,
        longitude: r.longitude,
        heading: r.heading || undefined,
        speed: r.speed || undefined,
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    } catch (err) {
      console.error("[Database] PostgreSQL error fetching ambulances:", err);
    }
  }

  return Array.from(globalStore.__aimless_ambulances?.values() || []);
}

export async function updateAmbulance(
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
): Promise<Ambulance | null> {
  await initializeDatabase();
  const now = new Date().toISOString();

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      const sets: string[] = ["updated_at = NOW()"];
      const params: unknown[] = [id];

      if (updates.status) {
        params.push(updates.status);
        sets.push(`status = $${params.length}`);
      }
      if (updates.currentIncidentId !== undefined) {
        params.push(updates.currentIncidentId);
        sets.push(`current_incident_id = $${params.length}`);
      }
      if (updates.currentHospitalId !== undefined) {
        params.push(updates.currentHospitalId);
        sets.push(`current_hospital_id = $${params.length}`);
      }
      if (updates.latitude !== undefined) {
        params.push(updates.latitude);
        sets.push(`latitude = $${params.length}`);
      }
      if (updates.longitude !== undefined) {
        params.push(updates.longitude);
        sets.push(`longitude = $${params.length}`);
      }

      await pg.query(
        `UPDATE ambulances SET ${sets.join(", ")} WHERE id = $1`,
        params
      );

      const res = await pg.query("SELECT * FROM ambulances WHERE id = $1", [id]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          vehicleNumber: r.vehicle_number,
          driverId: r.driver_id,
          driverName: r.driver_name,
          driverPhone: r.driver_phone,
          status: r.status as AmbulanceStatus,
          currentIncidentId: r.current_incident_id || undefined,
          currentHospitalId: r.current_hospital_id || undefined,
          latitude: r.latitude,
          longitude: r.longitude,
          heading: r.heading || undefined,
          speed: r.speed || undefined,
          updatedAt: new Date(r.updated_at).toISOString(),
        };
      }
    } catch (err) {
      console.error("[Database] PostgreSQL error updating ambulance:", err);
    }
  }

  const amb = globalStore.__aimless_ambulances?.get(id);
  if (!amb) return null;
  if (updates.status) amb.status = updates.status;
  if (updates.currentIncidentId !== undefined)
    amb.currentIncidentId = updates.currentIncidentId || undefined;
  if (updates.currentHospitalId !== undefined)
    amb.currentHospitalId = updates.currentHospitalId || undefined;
  if (updates.latitude !== undefined) amb.latitude = updates.latitude;
  if (updates.longitude !== undefined) amb.longitude = updates.longitude;
  amb.updatedAt = now;
  return amb;
}

// ==========================================
// Hospital Operations
// ==========================================

export async function getHospitals(): Promise<Hospital[]> {
  await initializeDatabase();

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      const res = await pg.query(
        `SELECT id, name, code, address, latitude, longitude, phone, status, available_beds, emergency_status, handled_severities
         FROM hospitals`
      );
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        phone: r.phone,
        status: r.status,
        availableBeds: r.available_beds,
        emergencyDepartmentStatus: r.emergency_status,
        handledSeverities: (r.handled_severities as IncidentSeverity[]) || [
          "LOW",
          "MODERATE",
          "HIGH",
          "CRITICAL",
        ],
      }));
    } catch (err) {
      console.error("[Database] PostgreSQL error fetching hospitals:", err);
    }
  }

  return Array.from(globalStore.__aimless_hospitals?.values() || []);
}

export async function updateHospital(
  id: string,
  updates: {
    status?: HospitalStatus;
    availableBeds?: number;
    emergencyDepartmentStatus?: HospitalReadinessState;
    handledSeverities?: IncidentSeverity[];
  }
): Promise<Hospital | null> {
  await initializeDatabase();

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      const sets: string[] = [];
      const params: unknown[] = [id];

      if (updates.status) {
        params.push(updates.status);
        sets.push(`status = $${params.length}`);
      }
      if (updates.availableBeds !== undefined) {
        params.push(updates.availableBeds);
        sets.push(`available_beds = $${params.length}`);
      }
      if (updates.emergencyDepartmentStatus) {
        params.push(updates.emergencyDepartmentStatus);
        sets.push(`emergency_status = $${params.length}`);
      }
      if (updates.handledSeverities) {
        params.push(updates.handledSeverities);
        sets.push(`handled_severities = $${params.length}`);
      }

      if (sets.length > 0) {
        await pg.query(
          `UPDATE hospitals SET ${sets.join(", ")} WHERE id = $1`,
          params
        );
      }

      const res = await pg.query("SELECT * FROM hospitals WHERE id = $1", [id]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          name: r.name,
          code: r.code,
          address: r.address,
          latitude: r.latitude,
          longitude: r.longitude,
          phone: r.phone,
          status: r.status,
          availableBeds: r.available_beds,
          emergencyDepartmentStatus: r.emergency_status,
          handledSeverities: (r.handled_severities as IncidentSeverity[]) || [
            "LOW",
            "MODERATE",
            "HIGH",
            "CRITICAL",
          ],
        };
      }
    } catch (err) {
      console.error("[Database] PostgreSQL error updating hospital:", err);
    }
  }

  const hosp = globalStore.__aimless_hospitals?.get(id);
  if (!hosp) return null;
  if (updates.status) hosp.status = updates.status;
  if (updates.availableBeds !== undefined) hosp.availableBeds = updates.availableBeds;
  if (updates.emergencyDepartmentStatus)
    hosp.emergencyDepartmentStatus = updates.emergencyDepartmentStatus;
  if (updates.handledSeverities) hosp.handledSeverities = updates.handledSeverities;
  return hosp;
}

export async function createAmbulance(data: {
  vehicleNumber: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  latitude?: number;
  longitude?: number;
}): Promise<Ambulance> {
  await initializeDatabase();
  const id = `amb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const ambulance: Ambulance = {
    id,
    vehicleNumber: data.vehicleNumber,
    driverId: data.driverId,
    driverName: data.driverName,
    driverPhone: data.driverPhone,
    status: "AVAILABLE",
    latitude: data.latitude || 9.9312,
    longitude: data.longitude || 76.2673,
    updatedAt: now,
  };

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      await pg.query(
        `INSERT INTO ambulances (id, vehicle_number, driver_id, driver_name, driver_phone, status, latitude, longitude, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          ambulance.vehicleNumber,
          ambulance.driverId,
          ambulance.driverName,
          ambulance.driverPhone,
          ambulance.status,
          ambulance.latitude,
          ambulance.longitude,
          now,
        ]
      );
    } catch (err) {
      console.error("[Database] PostgreSQL error inserting ambulance:", err);
    }
  }

  globalStore.__aimless_ambulances!.set(id, ambulance);
  return ambulance;
}

export async function createHospital(data: {
  name: string;
  code: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  availableBeds?: number;
  handledSeverities?: IncidentSeverity[];
}): Promise<Hospital> {
  await initializeDatabase();
  const id = `hosp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const hospital: Hospital = {
    id,
    name: data.name,
    code: data.code,
    address: data.address,
    latitude: data.latitude || 9.9312,
    longitude: data.longitude || 76.2673,
    phone: data.phone || "0484-2800000",
    status: "AVAILABLE",
    availableBeds: data.availableBeds || 12,
    emergencyDepartmentStatus: "READY",
    handledSeverities: data.handledSeverities || [
      "LOW",
      "MODERATE",
      "HIGH",
      "CRITICAL",
    ],
  };

  const pg = getPool();
  if (pg && isPgConnected) {
    try {
      await pg.query(
        `INSERT INTO hospitals (id, name, code, address, latitude, longitude, phone, status, available_beds, emergency_status, handled_severities)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          hospital.name,
          hospital.code,
          hospital.address,
          hospital.latitude,
          hospital.longitude,
          hospital.phone,
          hospital.status,
          hospital.availableBeds,
          hospital.emergencyDepartmentStatus,
          hospital.handledSeverities,
        ]
      );
    } catch (err) {
      console.error("[Database] PostgreSQL error inserting hospital:", err);
    }
  }

  globalStore.__aimless_hospitals!.set(id, hospital);
  return hospital;
}
