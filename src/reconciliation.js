const REQUIRED_DOCUMENTS = ['Invoice', 'Packing list', 'Bill of lading'];
const numeric = (value) => {
  const cleaned = String(value ?? '').replaceAll(',', '').replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '.' || cleaned === '-' || cleaned === '-.') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

function hasCompleteLineItems(shipment) {
  const items = Array.isArray(shipment.lineItems) ? shipment.lineItems : [{
    description: shipment.product, hsn_code: shipment.hsn, quantity: shipment.qty, unit_price: shipment.unit,
  }];
  return items.length > 0 && items.every((item) => String(item.description || '').trim()
    && String(item.hsn_code || '').trim() && numeric(item.quantity) !== null && numeric(item.unit_price) !== null);
}

export function reconcileShipment(shipment) {
  return [
    {
      key: 'invoice-total',
      label: 'Invoice total matches line sum',
      ok: numeric(shipment.total) !== null && numeric(shipment.lineSum) !== null
        && Math.abs(numeric(shipment.total) - numeric(shipment.lineSum)) <= 0.01,
      detail: `${shipment.currency} ${shipment.total} total · ${shipment.currency} ${shipment.lineSum} line sum`,
    },
    {
      key: 'gross-weight',
      label: 'Gross weight matches across documents',
      ok: [shipment.invoiceGross, shipment.packingGross, shipment.blGross].every((value) => numeric(value) !== null)
        && Math.max(numeric(shipment.invoiceGross), numeric(shipment.packingGross), numeric(shipment.blGross))
          - Math.min(numeric(shipment.invoiceGross), numeric(shipment.packingGross), numeric(shipment.blGross)) <= 0.001,
      detail: `Invoice ${shipment.invoiceGross} kg · Packing ${shipment.packingGross} kg · B/L ${shipment.blGross} kg`,
    },
    {
      key: 'packages',
      label: 'Packages match across documents',
      ok: [shipment.invoicePackages, shipment.packingPackages, shipment.blPackages].every((value) => numeric(value) !== null)
        && numeric(shipment.invoicePackages) === numeric(shipment.packingPackages)
        && numeric(shipment.invoicePackages) === numeric(shipment.blPackages),
      detail: `Invoice ${shipment.invoicePackages} · Packing ${shipment.packingPackages} · B/L ${shipment.blPackages}`,
    },
  ];
}

export function hasRequiredDocuments(shipment) {
  return REQUIRED_DOCUMENTS.every((document) => shipment.docs.includes(document));
}

export function canSubmitForApproval(shipment) {
  const confirmed = new Set(shipment.confirmedFields || []);
  const needsReview = (shipment.reviewRequired || []).some((field) => !confirmed.has(field));
  return hasRequiredDocuments(shipment) && hasCompleteLineItems(shipment)
    && !needsReview && reconcileShipment(shipment).every((check) => check.ok);
}

export function approvalBlockers(shipment) {
  if (!shipment) return ['Open a shipment first.'];
  const blockers = [];
  const missing = REQUIRED_DOCUMENTS.filter((document) => !shipment.docs.includes(document));
  if (missing.length) blockers.push(`Upload ${missing.join(', ')}.`);
  for (const check of reconcileShipment(shipment)) {
    if (!check.ok) blockers.push(`${check.label}: ${check.detail}.`);
  }
  const pending = (shipment.reviewRequired || []).filter((field) => !(shipment.confirmedFields || []).includes(field));
  if (pending.length) blockers.push(`Confirm ${pending.length} low-confidence field${pending.length === 1 ? '' : 's'}.`);
  const items = Array.isArray(shipment.lineItems) ? shipment.lineItems : null;
  if (items ? !items.length : !String(shipment.product || '').trim()) blockers.push('Add at least one invoice line item.');
  else if (!hasCompleteLineItems(shipment)) {
    blockers.push('Complete each line item: description, HSN, quantity and unit price.');
  }
  return blockers;
}

export function canExportShipment(shipment) {
  return shipment.status === 'Approved' && canSubmitForApproval(shipment);
}

export function filingCsv(shipment) {
  const headers = ['Shipment ID', 'Supplier', 'Invoice number', 'Currency', 'Incoterm', 'Item', 'HSN', 'Quantity', 'Unit price', 'Packages', 'Gross weight kg', 'Net weight kg', 'Container'];
  const items = shipment.lineItems?.length ? shipment.lineItems : [{
    description: shipment.product, hsn_code: shipment.hsn, quantity: shipment.qty, unit_price: shipment.unit,
  }];
  const cell = (value) => {
    let text = String(value ?? '');
    if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = items.map((item) => [shipment.id, shipment.supplier, shipment.invoice, shipment.currency, shipment.incoterm,
    item.description, item.hsn_code, item.quantity, item.unit_price, shipment.packages, shipment.gross, shipment.net, shipment.container]);
  return [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}
