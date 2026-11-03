# CargoLens

CargoLens is a desktop-first shipment-document review workspace for freight forwarders and customs brokers. It keeps the filing system unchanged: executives review shipment data and download a CSV after manager approval.

## Current implementation

- **Demo mode:** seeded illustrative shipments, local-only edits and local file previews. It does not perform OCR or AI extraction. Do not enter Company A data.
- **Connected mode:** Supabase email/password authentication, executive/manager roles, shipment records, private document storage, short-lived signed previews, audit events, manual-entry marking, and server-enforced submission/approval checks.
- **AI extraction:** intentionally disabled until an approved model and data-processing route is configured. Never send customer invoices, prices, importer contacts or documents to Gemini's free tier.
- **Export:** the current CSV is a starter layout. The filing software's real Excel/CSV template is required before it can be called production-ready.

## Local demo

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

With no `.env.local`, the app uses clearly labeled synthetic demo data. `npm run build` builds a split, minified production bundle; `npm test` runs the reconciliation checks.

## Supabase connected workspace

1. Create a Supabase project in the **Mumbai `ap-south-1` region**. Region selection controls the primary data location; it does not by itself establish legal compliance.
2. In Supabase Auth, disable public sign-ups and invite staff using unique work accounts. Enable email/password auth and configure allowed redirect URLs for localhost and the deployed application.
3. Apply `supabase/migrations/202611030001_initial.sql` to the new project.
4. Add the Supabase Project URL and **publishable/anon key** to a local `.env.local` using `.env.example` as the template. These two browser values are public identifiers; the database relies on RLS for access control.
5. The profile trigger assigns invited accounts the executive role. Promote the designated manager in the Supabase SQL editor after verifying their user ID:

   ```sql
   update public.profiles set role = 'manager' where user_id = '<verified-auth-user-uuid>';
   ```

6. Set the same two Vite environment variables in Vercel for the demo deployment. Do **not** put a Supabase service-role key or AI provider key in any `VITE_` variable or browser code.

The migration creates private storage with 20 MB per-file limits and PDF/JPG/PNG/WebP allow-listing. Storage objects are named beneath a shipment UUID, downloads require an authenticated session, and preview links expire after 60 seconds. The database blocks submission until all three document types are manually reviewed, required values and line items are filled, invoice total equals line sum, weights and package counts reconcile, and low-confidence fields are confirmed. A different manager must approve before export.

## AI and OCR decision

The app does not pretend that uploaded documents have been extracted. Before enabling AI, choose one of:

- A self-hosted OCR/vision service in India, with hardware, operations, security and backup ownership assigned; or
- A provider contract/tier whose no-training, retention, region, DPA and subprocessor terms have been reviewed and accepted. Keep its key server-side (for example, as a Supabase Function secret), require schema validation and source evidence, and test against the client's labeled 200-shipment set before use.

Gemini's published pricing marks free-tier content as used to improve Google's products and paid-tier content as not used for that purpose. The Gemini free tier therefore must not receive confidential client documents. Configure an explicit no-training route before enabling extraction.

## Deployment and client-data boundary

Vercel Hobby is for personal, non-commercial use, and its current terms permit use of Hobby content for model training. Do not deploy this commercial client workflow or place real customer data on Hobby. A Vercel deployment can host a synthetic demo; production needs an eligible commercial plan or a different host, a verified India-region architecture, an approved provider, and client sign-off.

Supabase Free is for exploration, has 1 GB storage, can pause inactive projects and does not include automatic backups. Three documents per shipment at the stated 1,100 shipments/month can exhaust that quota quickly. Treat Free as a synthetic-data pilot only, not the production storage/availability plan. Budgeted production needs retention/deletion rules, backups with recovery drills, monitoring, malware/file inspection, rate limits, and a provider review for DPDP obligations.

## Before client pilot

- Obtain the exact filing-software import workbook, column order, date/number formats and multi-line item rules.
- Provide 200 de-identified or approved historical shipments with field-level labels, including skewed and bilingual scans.
- Agree on role assignments, manager separation, retention/deletion periods, incident contacts and approved data processors.
- Evaluate per-field and per-supplier accuracy; keep low-confidence or failed-check values blocked until human confirmation.
- Run security, accessibility, performance, backup/restore and production smoke checks on the selected paid/approved environment.

## Verification

```sh
npm run build
npm test
```

The included tests cover invoice totals, required documents, weight/package mismatches, approval-gated export and CSV escaping. They do not replace a Supabase integration test, AI golden-set evaluation, security review or production smoke test.
