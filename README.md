# CargoLens AI

CargoLens AI is a human-reviewed freight documentation workspace for preparing shipment records from commercial invoices, packing lists, and bills of lading.

The goal is reliable extraction with visible evidence and human control: uncertain fields and cross-document mismatches must be resolved before a manager can approve an export.

## Scope

**In scope:** secure document intake, structured extraction with field-level confidence and source evidence, cross-document checks, human correction, audit history, manager approval, and CSV-compatible export.

**Out of scope:** customs portal filing, HSN classification or duty calculation, and customer-facing shipment tracking. An HSN value can be copied only when it appears in a source document.

## Technology

- React + Vite desktop-first client
- Node.js + Express API
- MongoDB with Mongoose
- A server-side, provider-independent vision extraction adapter

The first iteration uses a mock AI provider. Before connecting a real provider, confirm its India-region processing, retention, and no-training terms. Production hosting, database backups, and private document storage must be in India. Client pricing is confidential; importer contacts are personal data under India's DPDP Act 2023.

## Run locally

Requirements: Node.js 20 or newer and npm. A local MongoDB instance is needed when database features are introduced.

1. Copy server/.env.example to server/.env and set local values. Keep secrets out of Git.
2. Copy client/.env.example to client/.env.
3. From the repository root, run npm install.
4. Run npm run dev. The client is at http://localhost:5173 and the API health endpoint is http://localhost:4000/api/health.

The sample SESSION_SECRET is a placeholder and must be replaced locally. Never put provider keys in VITE_* variables; Vite exposes those values to the browser.

## Repository map

- client/ — React application
- server/ — Express API
- docs/ARCHITECTURE.md — boundaries, data flow, security, and deployment principles
- docs/PLAN.md — seven-day implementation plan

## Build

- npm run build builds the client for production.
- npm start starts the API.

## Learning and delivery approach

Build one understandable increment at a time. Each meaningful change should have its own clear commit. Preserve existing history; never force-push or commit local environment files, credentials, or real customer documents.

See the architecture and seven-day plan before extending the application.
