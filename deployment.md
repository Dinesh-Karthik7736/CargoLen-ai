# CargoLens Deployment Guide

**Project:** [CargoLens on GitHub](https://github.com/Dinesh-Karthik7736/CargoLen-ai)  
**Live demo:** [https://cargo-len-ai-c2ps.vercel.app](https://cargo-len-ai-c2ps.vercel.app)

This guide runs the synthetic take-home demo locally and deploys it on Vercel with Supabase authentication, database, private storage, and the `extract-document` Edge Function. Use synthetic shipment documents only. Do not enter Company A customer records, importer contacts, or confidential prices into this free-tier demonstration.

## Requirements

- Node.js 20.19+ or 22.12+
- VS Code and access to the CargoLens GitHub repository
- A Supabase project for connected-mode authentication, persistence, storage, and extraction
- A LlamaCloud API key for AI extraction (free-tier credits and quotas apply)
- A Vercel account connected to the repository

## Run locally

1. In VS Code, choose **File → Open Folder** and open the cloned `CargoLen-ai` repository.
2. Open **Terminal → New Terminal** and install dependencies:

   ```sh
   npm install
   ```

3. For the local synthetic demo, start without creating `.env.local`:

   ```sh
   npm run dev
   ```

   Open the local URL printed by Vite (normally `http://localhost:5173`). Demo mode uses synthetic seed shipments and local-only edits; it does not call the AI provider or save changes to Supabase.

4. To use the connected workspace, create `.env.local` in the repository root based on `.env.example` and set these names from Supabase **Project Settings → API**:

   ```dotenv
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   ```

   Enter the project URL and publishable/anon key in your local file. Never use a service-role key or provider key in a `VITE_` variable. Restart Vite after changing environment variables.
5. Sign in using an invited Supabase Auth account with a `profiles.role` of `executive` or `manager`. The role is stored in Supabase, not selected at sign-in.
6. Run checks after code changes:

   ```sh
   npm test
   npm run build
   ```

## Set up Supabase

1. Create or select the Supabase project. The current take-home project is in Frankfurt (`eu-central-1`), suitable for synthetic demonstration data only. For a client pilot, create an approved India-region project (Mumbai `ap-south-1`) and review hosting, provider, privacy, retention, and backup requirements first.
2. In **Authentication → Providers**, enable email/password. Disable public sign-ups for the invited-staff model. Add local and deployed application URLs to the allowed redirect URLs.
3. In **SQL Editor**, apply these migrations in order, once each:

   - `supabase/migrations/202611030001_initial.sql`
   - `supabase/migrations/202611030002_document_replacement.sql`
   - `supabase/migrations/202611030003_manager_approval_workflow.sql`

   The first migration creates `profiles`, `shipments`, `shipment_items`, `shipment_documents`, and `shipment_audit`; role and status types; indexes, triggers, Row Level Security policies, validation procedures, and the private `shipment-documents` Storage bucket. The second enables executive-only removal of mistaken uploads and audits the removal. The third adds staff codes and the separate `shipment_approval_events` history, scopes executive access to their own shipments, and adds guarded submission and manager-decision procedures.
4. Invite or create the executive and manager users in **Authentication → Users**. A trigger creates a profile with the executive role by default. After verifying the manager’s Auth user ID, assign the manager role in **SQL Editor**:

   ```sql
   update public.profiles
   set role = 'manager'
   where user_id = '<verified-manager-auth-user-uuid>';
   ```

   Leave executive profiles as `executive`. Migrations assign unique `EXE-#####` or `MGR-#####` staff codes. Never accept a user-provided role or expose a service-role key in browser code.
5. For a real checkout, migrations can be applied with the Supabase CLI instead of pasted into SQL Editor:

   ```sh
   npx supabase init
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

   Confirm the linked project before applying migrations. Do not run schema setup against a client production database without an approved change process.

## Configure AI extraction

1. Create a LlamaCloud account and API key. Free-tier credits, quotas, and regional availability can change; check current limits in the provider dashboard.
2. In the repository terminal, deploy the function with JWT verification enabled:

   ```sh
   npx supabase functions deploy extract-document
   ```

3. In **Supabase → Edge Functions → Secrets**, add these secret names and enter their values in Supabase (values are intentionally omitted here):

   - `LLAMA_CLOUD_API_KEY` — required
   - `LLAMA_CLOUD_PROJECT_ID` — optional, if the LlamaCloud workspace requires it
   - `LLAMA_EXTRACT_TIER` — optional; defaults to `cost_effective`
   - `APP_ORIGINS` — comma-separated allowed app origins, including the deployed URL and local development origin

   Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not copy the service-role key into Vercel or frontend variables.
4. Confirm `extract-document` is deployed and JWT verification is enabled. Try it with the synthetic sample PDFs. If credits are exhausted or the provider is unavailable, the user can enter fields manually.

The function accepts PDF, JPG, PNG, and WebP documents up to 20 MB. It downloads the private stored file server-side, submits it to LlamaCloud Extract with a structured field schema, requests confidence scores and source citations, validates the result, and saves extracted values and evidence. Scores below 82% and missing metadata require human confirmation. This is a model confidence signal, not a measured accuracy guarantee. HSN classification and duty calculation are out of scope.

## Deploy on Vercel

1. Import `Dinesh-Karthik7736/CargoLen-ai` in Vercel. Select `main` and the Vite framework. `vercel.json` sets `npm run build`, output folder `dist`, SPA routing, cache headers, and security headers.
2. In **Project Settings → Environment Variables**, add the following names for **Production** and, if needed, Preview/Development:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   Use values from Supabase project API settings. These are the only frontend variables required. Do not add `LLAMA_CLOUD_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to Vercel.
3. Deploy and copy the Vercel production URL. In Supabase Auth, add it to the site URL and redirect URL allow-list. Add the same origin to the `APP_ORIGINS` Edge Function secret, preserving any local origin already used.
4. Redeploy the Edge Function if its code changed, and redeploy the Vercel app after frontend code or Vite environment variable changes. Confirm the deployment is **Ready**.
5. Smoke-test the live synthetic demo: sign in as executive, upload the three sample documents, extract or enter data, review documents and checks, submit, then sign in as manager and approve/return/reject. Confirm status and decision history persist after refresh. Test CSV export only for a manager-approved shipment.

The current live demo URL is `https://cargo-len-ai-c2ps.vercel.app`. If Vercel assigns a different production domain, update Supabase redirect URLs and `APP_ORIGINS`.

## Demo reviewer accounts

These take-home credentials were supplied for reviewer access. They must exist in Supabase Auth, with the profile roles below, for connected-mode login to work.

| Role | Email | Password | Supabase profile role |
| --- | --- | --- | --- |
| Documentation executive | `demoexecutive1@gmail.com` | `executive123` | `executive` |
| Documentation manager | `demomanager1@gmail.com` | `manager123` | `manager` |

Use these accounts only for the assessment. Rotate or disable them afterward. If they are not present in the linked Supabase project, create/invite the users in Auth, set their passwords, and assign the manager profile role as above. Do not commit real credentials or secrets.

## Workflow and data controls

- Executives create and edit their own shipments, upload/replace/remove the invoice, packing list, and bill of lading, and review extracted or manually entered values against each source.
- Submission is blocked until all three document types are reviewed, required invoice fields and line items are complete, low-confidence values are confirmed, invoice total matches the line-item sum, and package counts and gross weights reconcile across documents.
- Managers review submitted shipments with the executive name and staff code. They can approve, reject with a reason, or return for correction with a reason. Decisions are stored in `shipment_approval_events`; field/document edits are stored in `shipment_audit`.
- Approved records remain in `shipments` with status `approved`; approval events are in a separate table. Rejected and returned decisions remain in event history, while the shipment goes to `needs_review` for executive correction.
- Only a different manager can approve a submitted shipment. Export is gated to manager-approved records with cleared checks. The current CSV is a starter filing layout; exact production import compatibility needs the actual filing-software workbook.
- Storage is private and preview links expire after 60 seconds. RLS limits executives to their own shipments and grants managers the scope defined in the migrations.
- Sample PDFs are synthetic. SHP-24811 intentionally disagrees on gross weight in its packing list; SHP-24812 uses imperfect scans.

## Troubleshooting

- **Blank page or configuration error:** verify both `VITE_` names in `.env.local` or Vercel, then restart or redeploy.
- **Wrong role after sign-in:** inspect the user’s `profiles` row and correct the role in Supabase SQL Editor.
- **Extraction function unreachable:** check that `extract-document` is deployed, JWT verification is enabled, `APP_ORIGINS` contains the exact app origin, and Supabase redirect/CORS settings include the app URL.
- **Provider error or HTTP 503:** verify `LLAMA_CLOUD_API_KEY`, provider project settings, and remaining quota. Retry later or use manual entry.
- **Submission blocked:** follow the on-screen blocker; check document reviews, required confirmations, line sum, package counts, and weights.
- **Manager cannot see a shipment:** confirm the executive submitted it and the manager profile is active with role `manager`.

## Take-home limitations

This is a synthetic-data assessment build. Vercel Hobby is intended for personal/non-commercial use; Supabase Free can pause inactive projects, has limited storage and does not provide the production backup/availability posture required for customer records. LlamaCloud free-tier extraction is external processing and has not been cleared for client documents, no-training terms, India residency, DPDP processing, or confidential pricing. Do not upload real importer contacts or customer prices.

