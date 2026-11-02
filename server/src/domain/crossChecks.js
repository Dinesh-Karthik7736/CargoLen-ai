const DEFAULT_WEIGHT_TOLERANCE_KG = 0.01;
const DEFAULT_PACKAGE_TOLERANCE = 0;

function comparableValues(documents, field) {
  return documents.flatMap((document) => {
    const value = document[field];
    return typeof value === "number" && Number.isFinite(value)
      ? [{ documentType: document.type, value }]
      : [];
  });
}

function compareAcrossDocuments({ documents, field, label, tolerance }) {
  const values = comparableValues(documents, field);
  if (values.length < 2) {
    return {
      key: field,
      label,
      status: "not_comparable",
      blocking: false,
      values,
      message: "Fewer than two source documents contain this value."
    };
  }

  const min = Math.min(...values.map(({ value }) => value));
  const max = Math.max(...values.map(({ value }) => value));
  const difference = Number((max - min).toFixed(3));
  const matched = difference <= tolerance;

  return {
    key: field,
    label,
    status: matched ? "passed" : "failed",
    blocking: !matched,
    values,
    difference,
    tolerance,
    message: matched
      ? "Source values agree within the configured tolerance."
      : `Source values differ by ${difference}.`
  };
}

function invoiceArithmetic(invoice) {
  const lines = invoice?.lineItems;
  if (!Number.isFinite(invoice?.totalMinorUnits) || !Array.isArray(lines) || lines.length === 0) {
    return {
      key: "invoiceTotal",
      label: "Invoice total vs line sum",
      status: "not_comparable",
      blocking: false,
      message: "Invoice total or line items are missing from the source."
    };
  }

  if (lines.some((line) => !Number.isSafeInteger(line.quantity) || !Number.isSafeInteger(line.unitPriceMinorUnits))) {
    return {
      key: "invoiceTotal",
      label: "Invoice total vs line sum",
      status: "not_comparable",
      blocking: false,
      message: "One or more line values need human confirmation before arithmetic can be checked."
    };
  }

  const lineSumMinorUnits = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPriceMinorUnits,
    0
  );
  const differenceMinorUnits = Math.abs(invoice.totalMinorUnits - lineSumMinorUnits);
  const passed = differenceMinorUnits <= 1;

  return {
    key: "invoiceTotal",
    label: "Invoice total vs line sum",
    status: passed ? "passed" : "failed",
    blocking: !passed,
    currency: invoice.currency,
    invoiceTotalMinorUnits: invoice.totalMinorUnits,
    lineSumMinorUnits,
    differenceMinorUnits,
    message: passed
      ? "Invoice total agrees with the line sum."
      : "Invoice total does not agree with the sum of invoice lines."
  };
}

export function runCrossChecks({ documents = [] } = {}) {
  const byType = new Map(documents.map((document) => [document.type, document]));
  const invoice = byType.get("invoice");

  return [
    invoiceArithmetic(invoice),
    compareAcrossDocuments({
      documents,
      field: "packages",
      label: "Packages across documents",
      tolerance: DEFAULT_PACKAGE_TOLERANCE
    }),
    compareAcrossDocuments({
      documents,
      field: "grossWeightKg",
      label: "Gross weight across documents",
      tolerance: DEFAULT_WEIGHT_TOLERANCE_KG
    }),
    compareAcrossDocuments({
      documents,
      field: "netWeightKg",
      label: "Net weight across documents",
      tolerance: DEFAULT_WEIGHT_TOLERANCE_KG
    })
  ];
}

export function canExport({ fields = [], checks = [], managerApproved = false } = {}) {
  const unresolvedFields = fields.some((field) =>
    field.required && (
      field.value === null ||
      field.value === undefined ||
      field.status === "needs_review"
    )
  );
  const unresolvedChecks = checks.some((check) =>
    check.blocking && check.status !== "cleared_by_human"
  );

  return managerApproved && !unresolvedFields && !unresolvedChecks;
}
