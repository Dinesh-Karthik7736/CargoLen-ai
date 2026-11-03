import test from 'node:test';
import assert from 'node:assert/strict';
import { canExportShipment, canSubmitForApproval, filingCsv, reconcileShipment } from '../src/reconciliation.js';

const complete = {
  id: 'SHP-24812', supplier: 'Company C', invoice: 'INV-2106', currency: 'EUR', incoterm: 'CIF Mumbai',
  product: 'Steel valve', hsn: '8481.80', qty: '180', unit: '42.50', packages: '24 crates',
  gross: '1,460 kg', net: '1,220 kg', container: 'TGHU 773020-8', total: '7650.00', lineSum: '7650.00',
  invoiceGross: '1460', packingGross: '1460', blGross: '1460', invoicePackages: '24', packingPackages: '24', blPackages: '24',
  docs: ['Invoice', 'Packing list', 'Bill of lading'], status: 'Ready to approve',
};

test('all checks pass for matching invoice, packing list, and bill of lading', () => {
  assert.deepEqual(reconcileShipment(complete).map((check) => check.ok), [true, true, true]);
  assert.equal(canSubmitForApproval(complete), true);
});

test('a 45 kg weight mismatch blocks approval submission', () => {
  const shipment = { ...complete, packingGross: '1505' };
  assert.equal(reconcileShipment(shipment)[1].ok, false);
  assert.equal(canSubmitForApproval(shipment), false);
});

test('an invoice total mismatch blocks approval submission', () => {
  assert.equal(canSubmitForApproval({ ...complete, total: '7650', lineSum: '7530' }), false);
});

test('a missing required document blocks submission', () => {
  assert.equal(canSubmitForApproval({ ...complete, docs: ['Invoice', 'Packing list'] }), false);
});

test('only a manager-approved shipment with all checks clear can export', () => {
  assert.equal(canExportShipment(complete), false);
  assert.equal(canExportShipment({ ...complete, status: 'Approved' }), true);
  assert.equal(canExportShipment({ ...complete, status: 'Approved', blPackages: '—' }), false);
});

test('filing CSV quotes cells and escapes embedded quotes', () => {
  const csv = filingCsv({ ...complete, supplier: 'Supplier "North"' });
  assert.match(csv, /"Supplier ""North"""/);
  assert.equal(csv.split('\r\n').length, 2);
});

test('filing CSV neutralizes spreadsheet formula input', () => {
  const csv = filingCsv({ ...complete, supplier: '=HYPERLINK("https://example.com")' });
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.com""\)"/);
});

test('numeric formatting differences do not create false reconciliation errors', () => {
  assert.equal(reconcileShipment({ ...complete, total: '7,650.00', lineSum: '7650' })[0].ok, true);
  assert.equal(reconcileShipment({ ...complete, invoicePackages: 24, packingPackages: '24', blPackages: 24 })[2].ok, true);
});

test('filing CSV includes each shipment line item', () => {
  const csv = filingCsv({ ...complete, lineItems: [
    { description: 'Valve body', hsn_code: '8481.80', quantity: 2, unit_price: 10 },
    { description: 'Seal kit', hsn_code: '4016.93', quantity: 4, unit_price: 3 },
  ] });
  assert.equal(csv.split('\r\n').length, 3);
  assert.match(csv, /"Valve body"/);
  assert.match(csv, /"Seal kit"/);
});
