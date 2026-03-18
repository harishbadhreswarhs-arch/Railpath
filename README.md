# RailPath

A comprehensive monorepo web application suite containing an **Admin Dashboard** and a **Client Portal**. RailPath provides real-time geospatial monitoring of rail gates, incident reporting (e.g., near-miss events), and secure authentication via Firebase.

## Project Structure
This repository is organized as an npm workspaces monorepo:
- `apps/client`: The Client Portal for users to report and monitor rail path conditions.
- `apps/admin`: The Administrative Dashboard for control grid management, user administration, and system logging.

## Tech Stack
- **Framework:** Next.js / React
- **Styling:** Tailwind CSS (Glossy Dark Theme)
- **Backend & Auth:** Firebase
- **Monorepo Management:** npm workspaces

## Quick Start
1. Install dependencies:
   ```bash
   npm run bootstrap
   ```
2. Run Client Portal:
   ```bash
   npm run dev:client
   ```
3. Run Admin Dashboard:
   ```bash
   npm run dev:admin
   ```
