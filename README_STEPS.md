Stubs and next steps

Files created at repo root are stubs to be moved into each Next.js app after you run create-next-app locally.

Suggested workflow:
1. Run the create-next-app commands locally (from repo root):
   npx create-next-app@latest apps/client --typescript --use-npm
   npx create-next-app@latest apps/admin --typescript --use-npm
2. Move the stub files into the generated apps:
   - Move apps-client-_app.tsx.stub -> apps/client/pages/_app.tsx
   - Move apps-client-index.tsx.stub -> apps/client/pages/index.tsx
   - Move apps-admin-index.tsx.stub -> apps/admin/pages/index.tsx
   - Move glossy-dark.css -> apps/client/glossy-dark.css (and to admin if desired)
   - Move tailwind.config.cjs and postcss.config.cjs to app root or to repo root and adjust package.json scripts
   - Move manifest.webmanifest and public-sw.js into the public/ folder of each app
   - Move firebase-client-stub.ts into apps/client/lib/firebase.ts
   - Move firebase-admin-stub.ts into apps/admin/lib/firebaseAdmin.ts (or use Cloud Functions)
3. Install dependencies in each app:
   npm install -D tailwindcss postcss autoprefixer && npm install firebase
4. Follow Tailwind docs to include the directives in globals.css and enable JIT.
5. Start dev servers:
   cd apps/client && npm run dev
   cd apps/admin && npm run dev

Security: Do NOT commit serviceAccount.json or FIREBASE_SERVICE_ACCOUNT_JSON to git. Use .env.local and .env.local.example provided earlier.
