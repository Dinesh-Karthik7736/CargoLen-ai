# CargoLens

CargoLens is a desktop-first prototype for reviewing import shipment documents before customs filing. It focuses on the time consuming handoff between invoice, packing list and bill of lading, with visible reconciliation and an approval gate before CSV export.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The app has no runtime service dependencies or paid API keys. Shipment edits persist in this browser's `localStorage`; uploaded file objects exist only in the current tab session.

## Prototype behavior

- Includes seeded shipments based on the brief, including the 45 kg weight mismatch and an invoice-total mismatch.
- Upload controls accept PDF and image files up to 20 MB. The selected source can be previewed locally in the browser; files are not saved on a server, OCR'd, or sent to an AI service.
- The document pane is an explicitly labeled illustrative preview, not the uploaded source. Extraction and confidence values are seeded examples, not model results.
- Invoice-total, gross-weight and package-count comparisons update as their comparison values are edited.
- An executive can submit a shipment only after all three documents are present and all checks pass. A separate manager role must approve it before export is enabled.
- CSV export is an example import layout. Confirm the customs filing software's exact column order, codes, date formats and line-item rules before integration.
- Field edits and approval transitions are logged in browser storage. Browser demo role switching is for walkthroughs only; it is not authentication or authorization, and the local log is not tamper-proof.

## Privacy and security boundary

Do not enter real client prices, importer contacts, or shipment documents in this demo. Browser storage is not encrypted, there is no authentication, and there is no server-side audit trail or retention control. No document data is sent to an external AI provider by this prototype.

The eventual client deployment needs an India-hosted API and database, private encrypted object storage, real executive/manager identities, server-enforced role checks, malware and file-type validation, rate limits, audit retention, deletion workflows, backups, monitoring, and a provider contract/configuration that prohibits training on client data. These controls must be implemented and verified before production use.

## Suggested production boundary

Keep the browser responsible for the accessible document-review workspace. Put shipment state, role checks, reconciliation, audit events, and export generation behind an API. Store originals in private object storage with short-lived access links. Run preprocessing/OCR and extraction as a retryable background job. Keep the extractor behind an adapter so a self-hosted vision model or a contractually approved no-training provider can be selected after India residency and privacy terms are verified. Treat extracted values as untrusted until a person confirms them.

The six-week client plan should begin with a labeled 200-shipment evaluation set, including skewed and bilingual scans. Measure accuracy by field and supplier, and measure entry time before and after. A free tier is suitable for this local prototype, but should not be assumed to meet client data residency, backup, availability, or support requirements.

## Checks

```sh
npm run build
```

Manual acceptance flow: correct the sample weight values and invoice total, submit as executive, approve as manager, then download the CSV. Try exporting before approval to confirm the action is blocked.

