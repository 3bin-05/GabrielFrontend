# G Λ B R I E L — Emergency Response Network

> **People · Faster · Safer**

GABRIEL is a real-time emergency coordination platform that connects citizens, ambulance drivers, and hospitals into a single unified response network.

---

## ✨ Features

| Role | Capabilities |
|------|-------------|
| **Citizen** | Report emergencies via GPS, track live incident status, manage emergency contacts |
| **Ambulance** | Accept dispatch missions, turn-by-turn navigation, real-time patient status |
| **Hospital** | Receive inbound alerts, manage ED readiness, track bed capacity live |
| **Admin** | Fleet oversight, incident dispatch, hospital capacity grid |

---

## 🖥 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon serverless)
- **Auth**: JWT-based session cookies
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Typography**: Plus Jakarta Sans · Space Grotesk

---

## 🚀 Getting Started

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/gabriel.git
cd gabriel
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
JWT_SECRET=your_strong_random_secret
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📁 Project Structure

```
app/
  page.tsx            – Public landing page
  login/              – Auth: Sign In
  register/           – Auth: Sign Up (Citizen / Ambulance / Hospital)
  citizen/            – Citizen Dashboard
  ambulance/          – Ambulance Driver Portal
  hospital/           – Hospital Emergency Dashboard
  admin/              – Admin Command Center
  api/                – REST API routes (auth, incidents, ambulances, hospitals)
components/
  auth/               – Login & Register forms
  layout/             – Navbar, Footer
lib/
  db.ts               – PostgreSQL + in-memory fallback store
  auth.ts             – JWT session helpers
  AuthContext.tsx     – React auth provider with role-based redirect
types/                – TypeScript types (auth, incident, ambulance, hospital)
public/images/        – Static assets (hero images)
```

---

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon, Supabase, etc.) |
| `JWT_SECRET` | Secret used to sign session tokens |

See [`.env.example`](.env.example) for the full template.

---

## 📝 License

MIT
