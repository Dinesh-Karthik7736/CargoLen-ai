# CargoLens AI architecture

## Product boundary

CargoLens helps freight documentation executives prepare shipment records from commercial invoices, packing lists, and bills of lading. It extracts fields, cross-checks documents, routes uncertainty to a person, records corrections, and exports only approved data.

The system does not file customs forms, predict missing HSN classifications, calculate duties, or provide a customer tracking portal. If an HSN value is present, extraction may copy it as written; it must never infer one.

## First version structure

- **client/** — React and Vite desktop-first workspace for shipment queues, document review, and approval.
- **server/** — Node and Express API. Authentication, authorization, validation, upload handling, orchestration, and exports stay server-side.
- **MongoDB** — shipment, document, extracted field, review, approval, and audit records. Use Mongoose models and one shared connection pool per API process.
- **AI adapter** — provider-independent server module. Start with a mock provider so the review flow can be built without sending client data anywhere. A real provider may be enabled only after confirming India-region processing, retention, and no-training terms.
- **Document storage** — private object storage in an India region for production; local files only for development. Keep documents out of public web roots and avoid logging document content.

## Data flow

1. An authorized executive creates a shipment and uploads its source documents.
2. The API validates file type, size, and ownership; stores originals privately; and records a processing job.
3. Extraction returns normalized values with source document/page evidence and a confidence score for each field.
4. Deterministic validation compares required fields and cross-document values. Low-confidence or mismatched values become review tasks.
5. A human reviews the source beside the extracted fields, edits or confirms values, and the system records who changed what and when.
6. A manager approves the complete shipment. Export is unavailable while required fields, failed checks, or approval remain unresolved.
7. An authorized user downloads a CSV/XLSX-compatible export. CargoLens does not submit it to customs.

## Reliability and security principles

- Role-based access: documentation executive, manager, and administrator. Enforce permissions in API routes, not only in the interface.
- Least privilege, secure sessions, CSRF protection where cookie sessions are used, strict CORS, rate limits, request validation, and safe error responses.
- Upload allowlists, byte and page limits, malware scanning before production processing, private storage, and short-lived signed downloads.
- Audit events for upload, extraction, field changes, review, approval, and export. Do not place sensitive document text or credentials in logs.
- Use MongoDB indexes for common shipment filters and unique business identifiers; review query plans before adding indexes.
- Paginate shipment lists at the API, debounce user search, and cache only safe, short-lived read results. Never cache private document responses in a shared CDN.
- Compress production responses, serve static assets through a CDN with immutable hashed filenames, lazy-load routes, and measure before adding memoization or extra dependencies.
- Health/readiness endpoints, structured logs, bounded retries, graceful shutdown, backups, and observable job failures.

## Deployment constraints

Production services, database backups, and document storage must be hosted in India. Treat client prices as confidential and importer contact details as personal data under India's DPDP Act 2023. Choose an AI provider with a documented no-training commitment and appropriate India-region processing before enabling it. Keep all provider credentials server-side. These are deployment and vendor-selection requirements; a prototype configuration alone does not prove compliance.
