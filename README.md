# SecureTenant — Multi-Tenant Security & Campaign Management Platform

SecureTenant is a robust, multi-tenant security operations and awareness campaign management platform. It provides strict organization-level data isolation, role-based access control (Admin, Manager, User), and automated security audit logging.

---

## 1. Architecture Overview & Key Design Decisions

```
┌─────────────────────────────────────────────────────────────┐
│                      React + Vite Client                    │
│     (Admin Dashboard / Manager Workspace / User Portal)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST (Axios Interceptors)
┌──────────────────────────────▼──────────────────────────────┐
│                    Express.js Backend API                   │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Auth Middleware (JWT Verify & Refresh Handling)     │   │
│   ├─────────────────────────────────────────────────────┤   │
│   │  RBAC Authorization (ADMIN, MANAGER, USER)          │   │
│   ├─────────────────────────────────────────────────────┤   │
│   │  Tenant Isolation Filter (req.user.organizationId)   │   │
│   └─────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Drizzle ORM
┌──────────────────────────────▼──────────────────────────────┐
│                  PostgreSQL Database (Neon)                 │
│    (organizations, users, campaigns, events, audit_logs)    │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions
- **Multi-Tenant Isolation**: Every database query on scoped entities automatically enforces `eq(table.organizationId, req.user.organizationId)`. The client never supplies the `organizationId` parameter directly; it is derived exclusively from the verified JWT session context on the backend.
- **Role-Based Workspaces**:
  - **ADMIN**: Full control over tenant members, campaigns, organization security events, and audit logs.
  - **MANAGER**: Operational campaign creation, status management, team assignments, and security event triage.
  - **USER**: Scoped member portal to view personally assigned campaigns, status, and activity.
- **Dual-Token Authentication**: Short-lived JWT access tokens (15m) paired with HTTP-only, secure refresh token cookies (7d) to prevent XSS credential theft.
- **Consistent SaaS Design System**: Built with Tailwind CSS and React Router, utilizing clean card aesthetics, minimalist pale text navigation, and responsive layouts.

---

## 2. Setup and Run Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or higher)
- [npm](https://www.npmjs.com/) (v9.x or higher)
- [PostgreSQL](https://www.postgresql.org/) (Local or Cloud instance such as [Neon](https://neon.tech/))

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *(Ensure `DATABASE_URL` and JWT secrets are populated)*

4. **Synchronize Database Schema**:
   ```bash
   npx drizzle-kit push
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5000`.

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development client**:
   ```bash
   npm run dev
   ```
   The frontend application will run on `http://localhost:5173`.

---

## 3. Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | API server listening port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/dbname?sslmode=require` |
| `JWT_ACCESS_SECRET` | Secret key for signing short-lived access JWTs | `super_secret_access_jwt_key` |
| `JWT_REFRESH_SECRET`| Secret key for signing refresh tokens | `super_secret_refresh_jwt_key` |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifespan | `15m` |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token lifespan | `7d` |

A sample template is provided in [`backend/.env.example`](backend/.env.example).

---

## 4. Database Setup & Sample Credentials

### Database Schema Migration
Run the following command in the `backend` folder to push the Drizzle schema to your PostgreSQL database:
```bash
npx drizzle-kit push
```

### Sample Organization & User Credentials
Once your database is connected, you can register a new organization on `/register` or sign in with sample accounts:

| Role | Email | Password | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@acmesecurity.com` | `Admin@123` | Full tenant management, Users, Campaigns, Security Events, Audit Logs |
| **MANAGER** | `manager@acmesecurity.com` | `Manager@123` | Campaign lifecycle management, User assignments, Security Event monitoring |
| **USER** | `user@acmesecurity.com` | `User@123` | Read-only view of personally assigned campaigns and dashboard metrics |

---

## 5. Security & Tenant Isolation Enforcement

1. **Server-Side Boundary**:
   - The backend is the sole authority for tenant isolation and permission checks.
   - Every request is validated through the `authenticate` middleware, which extracts `userId`, `organizationId`, and `role` directly from verified JWT payloads.

2. **Tenant Partitioning**:
   - Every resource table (`users`, `campaigns`, `security_events`, `audit_logs`) has a mandatory `organization_id` foreign key.
   - All `SELECT`, `UPDATE`, and `DELETE` operations include `eq(table.organizationId, req.user.organizationId)`.

3. **User Campaign Scoping**:
   - For `USER` role requests, campaigns are additionally joined with `campaign_users` on `campaign_users.user_id = req.user.id`.
   - Accessing unassigned campaigns returns a generic `404 Not Found` without disclosing the existence of campaigns belonging to other users or organizations.

4. **Immutable Audit Trail**:
   - Sensitive mutations (campaign creation, status modifications, team assignments, event triage) automatically insert an immutable audit log record containing actor details and timestamped metadata.
