# CargoLens AI delivery plan

The take-home target is a focused, end-to-end slice that can be built in seven days and expanded over the six-week client budget. Keep every meaningful increment small, explainable, and committed.

## Assessment scope

### Core workflow

1. Shipment list with status and search.
2. Create shipment and upload invoice, packing list, and bill of lading.
3. Process source pages with a real vision model; extract typed fields and confidence.
4. Review the source beside the fields, resolve low-confidence values and cross-check failures.
5. Require manager approval.
6. Export only cleared, approved values as a filing-software-compatible CSV.

Use six to eight screens. Roles in the core slice: documentation executive and manager. Do not build payments, messaging, customs portal filing, HSN classification or duty calculation, or an importer tracking portal.

### Extracted data

Parties, invoice number and date, currency, Incoterm, line items (including HSN only as printed), packages, weights, and containers. Store source document/page evidence and model confidence alongside each value.

### Cross-checks

- Invoice total against the sum of invoice line items, using currency-aware decimal arithmetic and an explicit tolerance.
- Package counts and gross/net weights between invoice, packing list, and bill of lading where the source documents provide those values.
- Missing values are “not present,” never inferred. Differences create review tasks and block export until a person clears them.

### Sample seed records

- **SHP-24811, Company B (China), LED panel light 40W:** invoice quantity 2,400 at USD 6.80, gross weight 3,120 kg; packing-list gross weight 3,165 kg. The 45 kg mismatch must be visible and unresolved until a person confirms the source.
- **SHP-24812, Company C (Sweden), Steel ball valve DN50:** invoice quantity 180 at EUR 42.50, gross weight 1,460 kg.

The brief’s annual baseline is 9,900 typing hours (₹34.65 lakh) plus 396 error cases at ₹9,000 (₹35.64 lakh), totalling ₹70.29 lakh. Treat these as client-provided assumptions, not verified measured outcomes.

## Seven-day take-home sequence

| Day | Goal | Deliverable |
| --- | --- | --- |
| 1 | Product and repo foundation | React/Vite + Express workspaces, secure environment examples, architecture, and setup guide |
| 2 | Shipment records and roles | MongoDB lifecycle, indexed shipment/document models, executive/manager authorization, audit event shape |
| 3 | Upload and real AI extraction | Private validated upload, PDF/image page handling, real vision-provider adapter, typed extraction with field confidence and evidence |
| 4 | Validation and review | Deterministic cross-checks, side-by-side review, correction history, manual entry for unreadable pages |
| 5 | Shipment workspace | Premium desktop-first queue and review UI, search, pagination, debounce, loading/empty/error states, accessibility |
| 6 | Approval and export | Manager gate, export blocker for unresolved items, filing-layout CSV, per-field and per-supplier accuracy report |
| 7 | Evaluation and handoff | 200-shipment evaluation protocol, measured accuracy, Lighthouse audit, deployment and demo notes |

## Performance, reliability, security, and UX acceptance checklist

Track each item as **planned**, **implemented**, and **verified**. A library or config setting alone does not count as verification.

- [ ] Cache appropriate API reads; define invalidation and never shared-cache private or rapidly changing shipment/document data.
- [ ] Load balancer and health/readiness behavior in the deployment setup; do not claim app code alone provides a load balancer.
- [ ] Index measured shipment/document query paths and verify query plans.
- [ ] Compress images for display without altering stored source evidence.
- [ ] Contextual loading skeletons, accessible empty states, and recoverable error states.
- [ ] Cache expensive safe queries with bounded TTL and invalidation.
- [ ] Avoid N+1 queries; use bounded populate/aggregation and inspect query counts.
- [ ] Debounce search inputs and cancel stale requests.
- [ ] Split client routes into chunks.
- [ ] CDN for versioned static assets; server-side caching only for safe public responses.
- [ ] Server-side pagination and stable sort for large lists.
- [ ] Run and record Lighthouse on the real app build.
- [ ] Compress API responses when payload size warrants it.
- [ ] Profile before memoizing; eliminate unnecessary React renders.
- [ ] Production JS/CSS minification and hashed asset names.
- [ ] Lazy-load noncritical screens and images.
- [ ] Defer noncritical scripts; no third-party scripts on document review without a clear need.
- [ ] Review dependencies and remove unused packages.
- [ ] Reuse one bounded MongoDB connection pool per API process.
- [ ] Add least-privilege roles, secure sessions, CSRF protection for cookie auth, rate limits, input validation, safe errors, upload limits/type checks, private storage, audit trail, secret hygiene, backups, graceful shutdown, and structured monitoring.
- [ ] Desktop review UX keeps document and fields side by side, uncertainty obvious at a glance, and common review actions one click away.

## Real AI and client-data constraints

Use a real vision model for extraction; do not call fixtures or deterministic parsers “AI.” Keep a provider adapter so model choice can be measured and changed. Send no real customer documents until the provider, region routing, retention, and no-training terms have been checked. Store credentials only in ignored local environment files or deployment secret storage, never in Vite variables or Git.

Production app, database, backups, and document storage must be hosted in India. Treat client prices as confidential and importer contacts as personal data under India's DPDP Act 2023. Skewed and bilingual pages need to be represented in evaluation data.

## Success measures

- Reduce entry time from the stated 45 minutes to under 15 minutes per shipment.
- Measure field accuracy on 200 historical shipments; target at least 95%.
- Target halving amended Bills of Entry over three months after deployment.

Do not report targets as achieved without measured evidence. Record field-level accuracy by supplier, correction outcomes, and the evaluation-set composition.

## Working agreement

Preserve existing Git history. No force-pushes, repository resets, secrets, or real customer documents in commits. Each meaningful feature gets a clear incremental commit. Do not mark a checklist item complete until the corresponding behavior has been inspected or measured.
