const REQUIRED_DOCUMENTS = ['Invoice', 'Packing list', 'Bill of lading'];

export function reconcileShipment(shipment) {
  return [
    {
      key: 'invoice-total',
      label: 'Invoice total matches line sum',
      ok: String(shipment.total) === String(shipment.lineSum),
      detail: `${shipment.currency} ${shipment.total} total · ${shipment.currency} ${shipment.lineSum} line sum`,
    },
    {
      key: 'gross-weight',
      label: 'Gross weight matches across documents',
      ok: [shipment.invoiceGross, shipment.packingGross, shipment.blGross].every((value) => value !== '—')
        && shipment.invoiceGross === shipment.packingGross
        && shipment.invoiceGross === shipment.blGross,
      detail: `Invoice ${shipment.invoiceGross} kg · Packing ${shipment.packingGross} kg · B/L ${shipment.blGross} kg`,
    },
    {
      key: 'packages',
      label: 'Packages match across documents',
      ok: [shipment.invoicePackages, shipment.packingPackages, shipment.blPackages].every((value) => value !== '—')
        && shipment.invoicePackages === shipment.packingPackages
        && shipment.invoicePackages === shipment.blPackages,
      detail: `Invoice ${shipment.invoicePackages} · Packing ${shipment.packingPackages} · B/L ${shipment.blPackages}`,
    },
  ];
}

export function hasRequiredDocuments(shipment) {
  return REQUIRED_DOCUMENTS.every((document) => shipment.docs.includes(document));
}

export function canSubmitForApproval(shipment) {
  return hasRequiredDocuments(shipment) && reconcileShipment(shipment).every((check) => check.ok);
}

export function canExportShipment(shipment) {
  return shipment.status === 'Approved' && canSubmitForApproval(shipment);
}

export function filingCsv(shipment) {
  const headers = ['Shipment ID', 'Supplier', 'Invoice number', 'Currency', 'Incoterm', 'Item', 'HSN', 'Quantity', 'Unit price', 'Packages', 'Gross weight kg', 'Net weight kg', 'Container'];
  const values = [shipment.id, shipment.supplier, shipment.invoice, shipment.currency, shipment.incoterm, shipment.product, shipment.hsn, shipment.qty, shipment.unit, shipment.packages, shipment.gross, shipment.net, shipment.container];
  return [headers, values].map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
}

