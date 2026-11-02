export const sampleShipments = [
  {
    shipmentId: "SHP-24811",
    supplier: "Company B (China)",
    item: "LED panel light 40W",
    documents: [
      {
        type: "invoice",
        supplier: "Company B (China)",
        lineItems: [{ description: "LED panel light 40W", quantity: 2400, currency: "USD", unitPrice: 6.8 }],
        grossWeightKg: 3120
      },
      {
        type: "packing_list",
        supplier: "Company B (China)",
        lineItems: [{ description: "LED panel light 40W", quantity: 2400 }],
        grossWeightKg: 3165
      }
    ]
  },
  {
    shipmentId: "SHP-24812",
    supplier: "Company C (Sweden)",
    item: "Steel ball valve DN50",
    documents: [
      {
        type: "invoice",
        supplier: "Company C (Sweden)",
        lineItems: [{ description: "Steel ball valve DN50", quantity: 180, currency: "EUR", unitPrice: 42.5 }],
        grossWeightKg: 1460
      }
    ]
  }
];
