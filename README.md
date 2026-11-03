# CargoLens

CargoLens is a desktop-first shipment-document review workspace for freight forwarders and customs brokers. It keeps the filing system unchanged: executives review shipment data and download a CSV after manager approval.

## Current implementation

- **Demo mode:** seeded illustrative shipments, local-only edits and local file previews. It does not perform OCR or AI extraction. Do not enter Company A data.
- **Connected mode:** Supabase email/password authentication, executive/manager roles, shipment records, private document storage, short-lived signed previews, audit events, manual-entry marking, and server-enforced submission/approval checks.
- **AI extraction:** a Supabase Edge Function calls Gemini using a server-side secret, validates structured output, saves per-field confidence and quoted source evidence, and requires human confirmation for low-confidence fields. Use only synthetic take-home documents with the free tier; never send real customer or confidential pricing data through it.
- **Export:** the current CSV is a starter layout. The filing software's real Excel/CSV template is required before it can be called production-ready.

## Local demo

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

With no `.env.local`, the app uses clearly labeled synthetic demo data. `npm run build` builds a split, minified production bundle; `npm test` runs the reconciliation checks.

### Synthetic extraction samples

- `public/samples/SHP-24811-*` contains clean, text-based invoice, packing-list, and bill-of-lading PDFs. The packing list intentionally reports 3,165 kg while the invoice and bill of lading report 3,120 kg.
- `public/samples/SHP-24812-*-scan.pdf` contains image-only, lightly skewed, faded, noisy scans for OCR/vision testing. The documents are synthetic and the three weights/packages agree.
- `tests/fixtures/document-extraction-golden.json` is the expected field reference and reconciliation result. Compare each extracted document with this reference to assess field accuracy and mismatch detection. Confidence scores are model estimates, not measured accuracy.

The sample preview is available in demo mode on shipments SHP-24811 and SHP-24812. For AI testing in the connected workspace, create a shipment and upload the corresponding PDFs from `public/samples`.

## Supabase connected workspace

1. Create a Supabase project in the **Mumbai `ap-south-1` region**. Region selection controls the primary data location; it does not by itself establish legal compliance.
2. In Supabase Auth, disable public sign-ups and invite staff using unique work accounts. Enable email/password auth and configure allowed redirect URLs for localhost and the deployed application.
3. Apply migrations `202611030001_initial.sql`, `202611030002_document_replacement.sql`, and `202611030003_manager_approval_workflow.sql` in order to the new project. The second migration enables executive-only removal of a mistaken upload. The third assigns stable `EXE-#####` / `MGR-#####` staff codes, scopes executive shipment access to the executive's own records, and creates a separate approval-event history for submissions, manager approvals, rejections and returns.
4. Add the Supabase Project URL and **publishable/anon key** to a local `.env.local` using `.env.example` as the template. These two browser values are public identifiers; the database relies on RLS for access control.
5. The profile trigger assigns invited accounts the executive role. Promote the designated manager in the Supabase SQL editor after verifying their user ID:

   ```sql
   update public.profiles set role = 'manager' where user_id = '<verified-auth-user-uuid>';
   ```

6. Set the same two Vite environment variables in Vercel for the demo deployment. Do **not** put a Supabase service-role key or AI provider key in any `VITE_` variable or browser code.

The migrations create private storage with 20 MB per-file limits and PDF/JPG/PNG/WebP allow-listing. Storage objects are named beneath a shipment UUID, downloads require an authenticated session, and preview links expire after 60 seconds. The database blocks submission until all three document types are reviewed, required values and line items are filled, invoice total equals line sum, weights and package counts reconcile, and low-confidence fields are confirmed. The manager queue contains only submitted and approved records and identifies the submitting executive by name and staff code. Manager decisions are stored in `shipment_approval_events`; rejection and return require a reason and send the executive's shipment back to the recheck queue. A different manager must approve before export.

## AI extraction setup (synthetic demo only)

The browser uploads a private document to Supabase Storage. The `extract-document` Edge Function verifies the signed-in executive, checks file type and size, downloads the document server-side and calls Gemini with a structured schema. It stores a confidence score and source quote per field. It does not classify HSN or calculate duty. Low-confidence values are added to the shipment's confirmation list. Run it only on the included synthetic PDFs or other data approved for the provider's free tier; free-tier documents are not appropriate for client prices, personal data, or real importer documents.

To enable it in a Supabase demo project:

1. Install the Supabase CLI and link the project, or use the project dashboard's Edge Function editor.
2. Deploy `supabase/functions/extract-document/index.ts` as `extract-document` with JWT verification enabled.
3. Add `GEMINI_API_KEY` as a Supabase Function secret. Optionally set `GEMINI_MODEL` and comma-separated `APP_ORIGINS` (the deployed URL plus local development URL). Never add these values to Vite variables, Git, or the browser.
4. Confirm the exact model and free-tier terms in the Google AI Studio project before use; quotas and model availability can change. If the function is missing or the secret is unset, extraction fails closed and the document remains available for manual entry.

The implementation is a take-home demonstration, not an approved production AI route. A real client pilot needs a provider with reviewed no-training, retention, region, DPA and subprocessor terms (or a self-hosted India-region service), plus evaluation on the labeled 200-shipment set. Gemini free-tier data handling is not suitable for confidential company information.

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

