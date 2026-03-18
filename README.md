RailPath — monorepo scaffold

This repository is initialized as an npm workspaces monorepo for the RailPath PWA project.

Quick start
1. Install dependencies: npm run bootstrap
2. Create Next.js apps (examples):
   npx create-next-app@latest apps/client --typescript --use-npm
   npx create-next-app@latest apps/admin --typescript --use-npm
3. Add a shared UI package: mkdir -p packages/ui && cd packages/ui && npm init -y
4. Add Tailwind, PWA, Firebase per Next.js documentation.

Firebase
- Do NOT commit service account keys. Use .env.local with FIREBASE_SERVICE_ACCOUNT_JSON or set FIREBASE_SERVICE_ACCOUNT_PATH to a local file.

Next steps
- Run the create-next-app commands above to scaffold apps, then ask me to wire Tailwind, PWA support, the glossy dark theme, and Firebase stubs.
