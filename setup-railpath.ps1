Param(
  [string]$Root = "C:\Users\sachi\Desktop\RailPath"
)

Write-Host "Scaffolding RailPath at $Root"

# Create root and workspace folders
New-Item -ItemType Directory -Force -Path $Root | Out-Null
Set-Location $Root

# Create root package.json if missing
if (!(Test-Path package.json)) {
@'
{
  "name": "railpath",
  "private": true,
  "workspaces": ["apps/*","packages/*"],
  "scripts": {
    "bootstrap": "npm install",
    "dev:client": "npm --prefix apps/client run dev",
    "dev:admin": "npm --prefix apps/admin run dev"
  }
}
'@ | Out-File -Encoding utf8 package.json
}

# Create workspace directories
New-Item -ItemType Directory -Force -Path "$Root\apps\client","$Root\apps\admin","$Root\packages\ui" | Out-Null

# Run create-next-app to scaffold TypeScript Next apps (requires network)
Write-Host "Running create-next-app for client (may prompt)..."
npx create-next-app@latest apps/client --typescript --use-npm --yes

Write-Host "Running create-next-app for admin (may prompt)..."
npx create-next-app@latest apps/admin --typescript --use-npm --yes

# Initialize packages/ui
Set-Location "$Root\packages\ui"
if (!(Test-Path package.json)) { npm init -y | Out-Null }
Set-Location $Root

# Write shared stubs and PWA/Tailwind helpers into apps
$glossyCss = @'
:root {
  --bg: #0b1020;
  --card: rgba(255,255,255,0.03);
  --glass: rgba(255,255,255,0.04);
  --accent: #7c3aed;
  --muted: rgba(255,255,255,0.6);
}

body {
  background: linear-gradient(180deg, #05060a 0%, var(--bg) 100%);
  color: #e6eef8;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
  -webkit-font-smoothing: antialiased;
}

.card {
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.015));
  border-radius: 16px;
  box-shadow: 0 6px 18px rgba(2,6,23,0.6), inset 0 1px 0 rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  backdrop-filter: blur(8px) saturate(120%);
}

.button-primary {
  background: linear-gradient(90deg, var(--accent), #4f46e5);
  color: white;
  padding: 10px 14px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 6px 14px rgba(124,58,237,0.18);
}
'@

# write to client
$clientPublic = "$Root\apps\client\public"
New-Item -ItemType Directory -Force -Path $clientPublic | Out-Null
$clientLib = "$Root\apps\client\lib"
New-Item -ItemType Directory -Force -Path $clientLib | Out-Null
$clientPages = "$Root\apps\client\pages"
if (!(Test-Path $clientPages)) { New-Item -ItemType Directory -Force -Path $clientPages | Out-Null }

$glossyCss | Out-File -Encoding utf8 "$Root\apps\client\glossy-dark.css"

@"
import '../glossy-dark.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
"@ | Out-File -Encoding utf8 "$Root\apps\client\pages\_app.tsx"

@"
import React from 'react';

export default function Home() {
  return (
    <main style={{padding:20}}>
      <div className=\"card\" style={{padding:20}}>
        <h1>RailPath — Client (PWA)</h1>
        <p>Mobile-first PWA to notify civilians when the railway gate is closed.</p>
      </div>
    </main>
  );
}
"@ | Out-File -Encoding utf8 "$Root\apps\client\pages\index.tsx"

@'
{
  "name": "RailPath",
  "short_name": "RailPath",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0b1020",
  "theme_color": "#111827",
  "icons": []
}
'@ | Out-File -Encoding utf8 "$clientPublic\manifest.webmanifest"

@'
// Minimal service worker stub for basic PWA offline caching
const CACHE_NAME = 'railpath-v1';
const ASSETS = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((r) => r || fetch(event.request))
  );
});
'@ | Out-File -Encoding utf8 "$clientPublic\public-sw.js"

# client firebase stub
@'
// Client-side Firebase initialization stub
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
};

export function initFirebaseClient() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return {
    auth: getAuth(),
    db: getFirestore()
  };
}
'@ | Out-File -Encoding utf8 "$clientLib\firebase.ts"

# write to admin
$adminPublic = "$Root\apps\admin\public"
New-Item -ItemType Directory -Force -Path $adminPublic | Out-Null
$adminLib = "$Root\apps\admin\lib"
New-Item -ItemType Directory -Force -Path $adminLib | Out-Null
$adminPages = "$Root\apps\admin\pages"
if (!(Test-Path $adminPages)) { New-Item -ItemType Directory -Force -Path $adminPages | Out-Null }

$glossyCss | Out-File -Encoding utf8 "$Root\apps\admin\glossy-dark.css"

@"
import React from 'react';

export default function AdminHome() {
  return (
    <main style={{padding:20}}>
      <div className=\"card\" style={{padding:20}}>
        <h1>RailPath — Admin</h1>
        <p>Admin dashboard to manage announcements and user preferences.</p>
      </div>
    </main>
  );
}
"@ | Out-File -Encoding utf8 "$Root\apps\admin\pages\index.tsx"

@'
// Server-side Firebase Admin initialization stub
import admin from "firebase-admin";
import fs from "fs";

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccount.json';
  if (fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
  }
  throw new Error('Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH');
}

if (!admin.apps.length) {
  const svc = getServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(svc),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });
}

export default admin;
'@ | Out-File -Encoding utf8 "$adminLib\firebaseAdmin.ts"

# Tailwind/postcss helpers at repo root
@'
module.exports = {
  content: [
    './apps/**/*.{js,ts,jsx,tsx}',
    './packages/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: []
};
'@ | Out-File -Encoding utf8 "$Root\tailwind.config.cjs"

@'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
'@ | Out-File -Encoding utf8 "$Root\postcss.config.cjs"

Write-Host "Scaffold complete. Next steps:"
Write-Host "  1) cd $Root"
Write-Host "  2) Run npm run bootstrap to install root workspace dependencies"
Write-Host "  3) cd apps/client && npm install && npm run dev"
Write-Host "  4) cd apps/admin && npm install && npm run dev"
Write-Host "  5) Install Tailwind in each app and follow README_STEPS.md for moving/styling files."
Write-Host "Reminder: Do NOT commit service account keys. Use .env.local or set FIREBASE_SERVICE_ACCOUNT_PATH."
