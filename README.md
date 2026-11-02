# CargoLens AI

CargoLens AI is a human-reviewed freight documentation workspace for preparing shipment records from commercial invoices, packing lists, and bills of lading.

The goal is reliable extraction with visible evidence and human control: uncertain fields and cross-document mismatches must be resolved before a manager can approve an export.

## Scope

**In scope:** secure document intake, structured extraction with field-level confidence and source evidence, cross-document checks, human correction, audit history, manager approval, and CSV-compatible export.

**Out of scope:** customs portal filing, HSN classification or duty calculation, and customer-facing shipment tracking. An HSN value can be copied only when it appears in a source document.

## Technology

- React + Vite desktop-first client
- Node.js + Express API
- MongoDB Atlas with Mongoose
- Amazon Bedrock vision extraction through a server-side adapter

Bedrock is configured for the Mumbai region by default. Confirm the chosen model's regional routing, retention settings, and terms in the AWS account before processing real documents. Production hosting, database backups, and private document storage must be in India. Client pricing is confidential; importer contacts are personal data under India's DPDP Act 2023.

## Run locally

Requirements: Node.js 20 or newer and npm. Create a MongoDB Atlas cluster and database user before starting the API.

1. Copy server/.env.example to server/.env.
2. Replace the Atlas URI with your cluster's SRV connection string. In Atlas, allow only your development IP in Network Access and give the database user only the permissions it needs for the CargoLens database.
3. Configure AWS credentials using a local AWS profile or SSO session with Bedrock invocation permission in ap-south-1. Keep credentials out of .env and Git. Confirm model access and data-retention settings in AWS.
4. Copy client/.env.example to client/.env.
5. From the repository root, run npm install, then npm run dev.

The client is at http://localhost:5173 and the API health endpoint is http://localhost:4000/api/health. The readiness endpoint at /api/ready reports whether MongoDB is connected.

The sample SESSION_SECRET is a placeholder and must be replaced locally. Never put AWS credentials in VITE_* variables; Vite exposes those values to the browser. Never commit .env files or real customer documents.

## Repository map

- client/ — React application
- server/ — Express API
- docs/ARCHITECTURE.md — boundaries, data flow, security, and deployment principles
- docs/PLAN.md — assessment scope, seven-day plan, and performance/security/UX acceptance checklist

## Build

- npm run build builds the client for production.
- npm start starts the API.

## Learning and delivery approach

Build one understandable increment at a time. Each meaningful change should have its own clear commit. Preserve existing history; never force-push or commit local environment files, credentials, or real customer documents.

See the architecture and delivery plan before extending the application.
