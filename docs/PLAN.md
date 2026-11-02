# Seven-day build plan

A focused take-home plan. Each day should end with a usable increment, a short explanation of the decisions, and a clear commit.

| Day | Goal | Deliverable |
| --- | --- | --- |
| 1 | Foundation and product boundaries | React/Vite + Express workspaces, secure configuration examples, architecture, and setup guide |
| 2 | Shipment records and access control | MongoDB connection lifecycle, indexed shipment/document models, role-aware API foundation, and audit event shape |
| 3 | Secure document intake and extraction | Validated private uploads, extraction provider interface, mock adapter, structured fields with confidence and page evidence |
| 4 | Cross-checks and human review | Required-field rules, invoice/packing-list/BOL checks, correction history, and unreadable-document manual entry |
| 5 | Executive workspace | Desktop-first shipment queue, search and pagination, document review, contextual skeletons, clear errors, and accessible interactions |
| 6 | Manager approval and export | Approval gate, audit trail, CSV export, unresolved-issue blocking, and performance/security hardening |
| 7 | Evaluation and handoff | Representative document evaluation set, accuracy and correction metrics, deployment notes for India hosting, demo walkthrough, and Lighthouse review |

## Definition of done

- No unresolved low-confidence required field or failed cross-check can be exported.
- Every correction and approval has an actor and timestamp.
- Extracted HSN values are copied only when present in source documents; no classification or duty calculation is added.
- The AI adapter can be tested with fixtures without transmitting real client data.
- Large lists are paginated, user search is debounced, and caching avoids sensitive or fast-changing records.
- Important flows have manual or automated checks documented before they are called complete.
