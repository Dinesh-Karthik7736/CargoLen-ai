import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headersFor = (origin: string) => {
  const allowed = (Deno.env.get('APP_ORIGINS') || 'http://localhost:5173,http://localhost:5174')
    .split(',').map((value) => value.trim()).filter(Boolean);
  const corsOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
};

const fieldSchema = (kind: 'string' | 'number') => ({
  type: 'object',
  properties: {
    value: { type: [kind, 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    evidence: { type: ['string', 'null'] },
  },
  required: ['value', 'confidence', 'evidence'],
});

const schema = {
  type: 'object',
  properties: {
    document_type: { type: 'string', enum: ['invoice', 'packing_list', 'bill_of_lading'] },
    fields: {
      type: 'object',
      properties: {
        supplier_name: fieldSchema('string'), supplier_country: fieldSchema('string'), buyer_name: fieldSchema('string'),
        invoice_number: fieldSchema('string'), invoice_date: fieldSchema('string'), currency: fieldSchema('string'),
        incoterm: fieldSchema('string'), invoice_total: fieldSchema('number'), package_count: fieldSchema('number'),
        package_type: fieldSchema('string'), gross_weight_kg: fieldSchema('number'), net_weight_kg: fieldSchema('number'),
        container_numbers: fieldSchema('string'),
      },
      required: ['supplier_name','supplier_country','buyer_name','invoice_number','invoice_date','currency','incoterm','invoice_total','package_count','package_type','gross_weight_kg','net_weight_kg','container_numbers'],
    },
    line_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: fieldSchema('string'), hsn_code: fieldSchema('string'), quantity: fieldSchema('number'),
          unit_price: fieldSchema('number'), line_total: fieldSchema('number'),
        },
        required: ['description','hsn_code','quantity','unit_price','line_total'],
      },
    },
  },
  required: ['document_type','fields','line_items'],
};

const confidenceNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0;
};

Deno.serve(async (request) => {
  const cors = headersFor(request.headers.get('origin') || '');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!url || !anonKey || !serviceKey || !geminiKey) {
    return new Response(JSON.stringify({ error: 'Extraction service is not configured. Add GEMINI_API_KEY to Supabase Function secrets.' }), { status: 503, headers: cors });
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Sign in to extract shipment documents.' }), { status: 401, headers: cors });
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return new Response(JSON.stringify({ error: 'Your session has expired. Sign in again.' }), { status: 401, headers: cors });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile } = await admin.from('profiles').select('role,disabled_at').eq('user_id', user.id).maybeSingle();
  if (!profile || profile.disabled_at || profile.role !== 'executive') return new Response(JSON.stringify({ error: 'Only active documentation executives can run extraction.' }), { status: 403, headers: cors });

  let documentId: string;
  try {
    const body = await request.json();
    documentId = String(body.document_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(documentId)) throw new Error('Invalid document ID.');
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request.' }), { status: 400, headers: cors });
  }

  const { data: document, error: documentError } = await admin.from('shipment_documents')
    .select('id,shipment_id,document_type,object_path,mime_type,size_bytes,processing_status')
    .eq('id', documentId).maybeSingle();
  if (documentError || !document) return new Response(JSON.stringify({ error: 'Document not found.' }), { status: 404, headers: cors });
  if (!['application/pdf','image/jpeg','image/png','image/webp'].includes(document.mime_type) || document.size_bytes > 20 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'This file type or size is not supported.' }), { status: 415, headers: cors });
  }
  if (!['uploaded','failed'].includes(document.processing_status)) return new Response(JSON.stringify({ error: 'This document is already being processed or reviewed.' }), { status: 409, headers: cors });
  const { data: claimed, error: claimError } = await admin.from('shipment_documents').update({ processing_status: 'processing', failure_reason: null })
    .eq('id', documentId).in('processing_status', ['uploaded','failed']).select('id').maybeSingle();
  if (claimError || !claimed) return new Response(JSON.stringify({ error: 'Another extraction is already running for this document.' }), { status: 409, headers: cors });

  try {
    const { data: file, error: fileError } = await admin.storage.from('shipment-documents').download(document.object_path);
    if (fileError || !file) throw new Error('The private source file could not be opened.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > 20 * 1024 * 1024) throw new Error('The source file is empty or exceeds the 20 MB limit.');
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    const base64 = btoa(binary);
    const documentContent = document.mime_type === 'application/pdf'
      ? { type: 'document', data: base64, mime_type: document.mime_type }
      : { type: 'image', data: base64, mime_type: document.mime_type };
    const prompt = `Read this import shipment ${document.document_type.replaceAll('_',' ')}. It may be skewed or multilingual. Extract only values visibly present in this document. Do not infer, classify, calculate duty, or invent an HSN code. If HSN is absent, return null with confidence 0. For each value return a confidence from 0 to 1 and a short exact source quote; if uncertain or absent use null and an empty quote. For quantities, prices, weights and totals, return numbers only and preserve the printed unit/currency separately. Return the document_type as ${document.document_type}.`;
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': geminiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('GEMINI_MODEL') || 'gemini-3.8-flash',
        input: [documentContent, { type: 'text', text: prompt }],
        response_format: { type: 'text', mime_type: 'application/json', schema },
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}. Check the model key, quota and model availability.`);
    const modelResponse = await response.json();
    const text = modelResponse.output_text || modelResponse.output?.find((part: { type?: string }) => part.type === 'text')?.text;
    if (typeof text !== 'string') throw new Error('AI provider returned no structured document data.');
    const result = JSON.parse(text);
    if (result.document_type !== document.document_type || !result.fields || !Array.isArray(result.line_items)) throw new Error('AI result failed document schema validation.');

    const plainFields: Record<string, unknown> = {};
    const confidence: Record<string, number> = {};
    const evidence: Record<string, string | null> = {};
    const reviewRequired: string[] = [];
    for (const [key, field] of Object.entries(result.fields as Record<string, { value?: unknown; confidence?: unknown; evidence?: unknown }>)) {
      const score = confidenceNumber(field?.confidence);
      plainFields[key] = field?.value ?? null;
      confidence[key] = Math.round(score * 100);
      evidence[key] = typeof field?.evidence === 'string' ? field.evidence.slice(0, 240) : null;
      if (score < 0.82) reviewRequired.push(`${document.document_type}.${key}`);
    }
    const lineItems = result.line_items.slice(0, 200).map((item: Record<string, { value?: unknown; confidence?: unknown; evidence?: unknown }>, index: number) => {
      const values: Record<string, unknown> = {};
      const itemConfidence: Record<string, number> = {};
      const itemEvidence: Record<string, string | null> = {};
      for (const key of ['description','hsn_code','quantity','unit_price','line_total']) {
        const field = item[key]; const score = confidenceNumber(field?.confidence);
        values[key] = field?.value ?? null; itemConfidence[key] = Math.round(score * 100);
        itemEvidence[key] = typeof field?.evidence === 'string' ? field.evidence.slice(0, 240) : null;
        if (score < 0.82) reviewRequired.push(`${document.document_type}.items.${index + 1}.${key}`);
      }
      return { ...values, confidence: itemConfidence, evidence: itemEvidence, line_number: index + 1 };
    });

    const { error: updateDocError } = await admin.from('shipment_documents').update({
      processing_status: 'complete', extracted_data: { ...plainFields, line_items: lineItems, _evidence: evidence },
      field_confidence: confidence, extraction_provider: 'Google Gemini API', extraction_model: Deno.env.get('GEMINI_MODEL') || 'gemini-3.8-flash',
      extracted_at: new Date().toISOString(), failure_reason: null,
    }).eq('id', documentId);
    if (updateDocError) throw new Error('Could not save the validated extraction result.');

    const { data: shipment } = await admin.from('shipments').select('review_required_fields').eq('id', document.shipment_id).single();
    const pending = [...new Set([...(shipment?.review_required_fields || []), ...reviewRequired])];
    if (document.document_type === 'invoice') {
      const number = (value: unknown) => value === null || value === undefined || value === '' ? null : Number(value);
      const containers = String(plainFields.container_numbers || '').split(/[;,\n]/).map((value) => value.trim()).filter(Boolean);
      const { error: shipmentError } = await admin.from('shipments').update({
        supplier_name: String(plainFields.supplier_name || ''), supplier_country: plainFields.supplier_country || null,
        invoice_number: plainFields.invoice_number || null, invoice_date: plainFields.invoice_date || null,
        currency: plainFields.currency ? String(plainFields.currency).toUpperCase().slice(0, 3) : null,
        incoterm: plainFields.incoterm || null, invoice_total: number(plainFields.invoice_total),
        package_count: number(plainFields.package_count), package_type: plainFields.package_type || null,
        gross_weight_kg: number(plainFields.gross_weight_kg), net_weight_kg: number(plainFields.net_weight_kg),
        container_numbers: containers, review_required_fields: pending,
      }).eq('id', document.shipment_id);
      if (shipmentError) throw new Error('Could not save invoice fields.');
      if (lineItems.length) {
        const rows = lineItems.map((item: Record<string, unknown>) => ({
          shipment_id: document.shipment_id, line_number: item.line_number, description: String(item.description || ''),
          hsn_code: item.hsn_code ? String(item.hsn_code).slice(0, 24) : null,
          quantity: item.quantity === null ? null : Number(item.quantity), unit_price: item.unit_price === null ? null : Number(item.unit_price),
          line_total: item.line_total === null ? null : Number(item.line_total), confidence: item.confidence,
        }));
        const { error: itemError } = await admin.from('shipment_items').upsert(rows, { onConflict: 'shipment_id,line_number' });
        if (itemError) throw new Error('Could not save extracted line items.');
      }
    } else {
      const { error: shipmentError } = await admin.from('shipments').update({ review_required_fields: pending }).eq('id', document.shipment_id);
      if (shipmentError) throw new Error('Could not save review requirements.');
    }
    return new Response(JSON.stringify({ status: 'complete', review_required_fields: reviewRequired }), { status: 200, headers: cors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Document extraction failed.';
    await admin.from('shipment_documents').update({ processing_status: 'failed', failure_reason: message.slice(0, 300) }).eq('id', documentId);
    return new Response(JSON.stringify({ error: message }), { status: 422, headers: cors });
  }
});
