# 🚀 Project Status: Raute App

**Last Updated:** January 2026
**Version:** 1.0.0 (Beta)

## 📌 Overview
Raute is a mobile-first SaaS application for route optimization, delivery management, and driver tracking. It allows managers to import orders, optimize routes using AI/Algorithms, and assign them to drivers who use a dedicated mobile interface for navigation and proof of delivery.

---

## ✅ Completed Features (Verified in Code)

### 1. 🔐 Authentication & Security
- [x] **Supabase Auth:** Email/Password implementation (`app/login`, `app/signup`).
- [x] **Role-Based Access Control (RBAC):** Distinct flows for `manager` and `driver` (`lib/utils`,`middleware.ts`).
- [x] **Row Level Security (RLS):** Database policies enforced for multi-tenant isolation (`supabase/schema.sql`).
- [x] **Profile Management:** Auto-creation of user profiles and company associations.

### 2. 📦 Order Management
- [x] **CRUD Operations:** Create, Read, Update, Delete orders (`app/orders`).
- [x] **AI Import:** Parse order details from images using Gemini AI (`lib/gemini.ts`).
- [x] **Geocoding:** Automatic address-to-coordinate conversion using Google Maps API with Nominatim fallback.
- [x] **Bulk Actions:** Multi-select and delete capability.
- [x] **Status Workflow:** Pending -> Assigned -> In Progress -> Delivered/Cancelled.

### 3. 🚚 Driver Management
- [x] **Driver Database:** Manage driver profiles, vehicle types, and contact info (`app/drivers`).
- [x] **Online/Offline Status:** Real-time visibility of driver availability (`app/orders` - Driver View).
- [x] **Activity Logging:** History of driver shifts and status changes (`supabase/dispatcher_features.sql`).
- [x] **Mobile-First UI:** Dedicated bottom-tab navigation and touch-friendly interface for drivers.

### 4. 🗺️ Mapping & Tracking
- [x] **Interactive Maps:** Real-time visualization of orders and drivers (`app/map`).
- [x] **Live Tracking:** Real-time updates via Supabase Subscription channels.
- [x] **Route Visualization:** visual display of assigned routes on the map.
- [x] **Navigation:** Integration with external GPS apps (Google Maps/Waze).

### 5. 🧩 Route Optimization
- [x] **Algorithm:** Custom greedy nearest-neighbor algorithm with 2-Opt optimization (`lib/optimizer.ts`).
- [x] **Constraints:** Handles time windows and load balancing.
- [x] **Auto-Assignment:** Logic to assign orders to the nearest available driver.

### 6. 📊 Dashboard
- [x] **Real Metrics:** Live stats for Total Orders, In Progress, Delivered, and Cancelled (`app/dashboard`).
- [x] **Driver Performance:** Progress bars showing stops completed vs total.
- [x] **Activity Feed:** Recent system events.

---

## 🛠 Tech Stack
- **Frontend Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Mobile:** Capacitor 6 (iOS/Android Native Shell)
- **Maps:** Leaflet / React-Leaflet / Google Maps API
- **AI:** Google Gemini (for OCR order import)

---

## 🚧 Known Issues / To-Do
- [ ] **Mobile Build Pipeline:** Verify `output: export` configuration for reliable Capacitor builds (Static Export is currently commented out in `next.config.mjs`).
- [ ] **Push Notifications:** Native mobile push notifications (Capacitor plugin implementation required).
- [ ] **Advanced Reporting:** Exportable CSV/PDF reports for managers.

---

## 📂 Key Directory Structure
- `app/drivers/` - Driver management Logic
- `app/orders/` - Order CRUD & Driver Task View
- `app/map/` - Live Fleet Map
- `app/dashboard/` - Analytics & Overview
- `lib/optimizer.ts` - Core Routing Algorithm
- `supabase/` - Database Schema & Migrations
