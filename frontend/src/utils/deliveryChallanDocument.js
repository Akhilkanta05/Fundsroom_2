/**
 * Utility to generate, download, and print professional Delivery Challan documents
 */

export function generateDeliveryChallanHtml(dispatch) {
  if (!dispatch) return '';

  const items = dispatch.items || [];
  const totalUnits = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Delivery Challan - ${dispatch.dispatch_number}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; padding: 20px; font-size: 13px; line-height: 1.5; background: #fff; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 18px; }
    .company-title { font-size: 20px; font-weight: 800; color: #065f46; letter-spacing: -0.02em; }
    .company-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 18px; color: #059669; font-weight: 800; text-transform: uppercase; }
    .doc-number { font-family: monospace; font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .status-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #dcfce7; color: #15803d; text-transform: uppercase; margin-top: 4px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 18px; }
    .section-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .client-name { font-size: 14px; font-weight: 700; color: #0f172a; }
    .info-row { font-size: 12px; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #065f46; color: #fff; font-size: 11px; font-weight: 700; padding: 8px 10px; text-align: left; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .summary-box { display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; }
    .notes-box { background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-size: 11px; color: #475569; margin-bottom: 25px; }
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 35px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; }
    .sign-box { border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 11px; font-weight: 600; color: #0f172a; }
    .sign-sub { font-size: 9px; color: #64748b; font-weight: normal; margin-top: 2px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 15px; border-radius: 6px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
    <span style="color: #15803d; font-weight: 600;">Official Delivery Challan & Consignment Dispatch Manifest</span>
    <button onclick="window.print()" style="background: #059669; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; font-weight: 700; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div>
      <div class="company-title">INDUS INDUSTRIAL SUPPLY LTD.</div>
      <div class="company-sub">Heavy Engineering, Piping & Industrial Valve Manufacturing Unit</div>
      <div class="company-sub">Plot 45, MIDC Industrial Area, Pune - 411018 | Tel: +91 20 2740 0000</div>
    </div>
    <div class="doc-title">
      <h1>Delivery Challan</h1>
      <div class="doc-number">${dispatch.dispatch_number}</div>
      <div><span class="status-badge">DISPATCH CONFIRMED</span></div>
    </div>
  </div>

  <div class="details-grid">
    <div>
      <div class="section-label">Consignee (Recipient Customer):</div>
      <div class="client-name">${dispatch.company_name || 'Valued Customer'}</div>
      <div class="info-row">Attn: <strong>${dispatch.contact_person || 'Logistics Incharge'}</strong></div>
      <div class="info-row">Contact: ${dispatch.mobile || 'N/A'}</div>
      <div class="info-row">Destination: <strong>${dispatch.city || 'Domestic'}</strong></div>
    </div>
    <div>
      <div class="section-label">Logistics & Consignment Details:</div>
      <div class="info-row">Sales Order #: <strong style="font-family: monospace; color: #1e40af;">${dispatch.order_number || 'N/A'}</strong></div>
      <div class="info-row">Dispatch Date: <strong>${dispatch.dispatch_date ? new Date(dispatch.dispatch_date).toLocaleDateString() : new Date().toLocaleDateString()}</strong></div>
      <div class="info-row">Vehicle Number: <strong style="font-family: monospace; color: #065f46;">${dispatch.vehicle_number || 'N/A'}</strong></div>
      <div class="info-row">Driver Incharge: <strong>${dispatch.driver_name || 'N/A'}</strong></div>
      <div class="info-row">Dispatched By: ${dispatch.dispatched_by_name || 'Warehouse Supervisor'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;">#</th>
        <th>Product Code</th>
        <th>Product Description</th>
        <th>Category</th>
        <th style="text-align: right;">Quantity Shipped</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-family: monospace; font-weight: 700; color: #1e40af;">${it.product_code || '-'}</td>
          <td>
            <div style="font-weight: 600;">${it.product_name}</div>
          </td>
          <td>${it.category || 'Components'}</td>
          <td style="text-align: right; font-weight: 700; color: #065f46; font-size: 13px;">
            ${it.quantity} ${it.unit || 'PCS'}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary-box">
    <div>
      <span style="font-size: 12px; color: #15803d; font-weight: 700;">Total Line Items: ${items.length}</span>
    </div>
    <div>
      <span style="font-size: 14px; color: #065f46; font-weight: 800;">
        Total Shipped Volume: ${totalUnits} Units
      </span>
    </div>
  </div>

  <div class="notes-box">
    <strong>Transport Instructions & Security Declaration:</strong>
    <p style="margin-top: 4px;">${dispatch.notes || 'Goods dispatched in undamaged factory packing. Inspect seal integrity before unleading.'}</p>
    <p style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
      Material manufactured and checked in conformity with ISO 9001 quality specifications. Received in apparent good condition.
    </p>
  </div>

  <div class="signatures-grid">
    <div class="sign-box">
      <div>Warehouse Dispatcher</div>
      <div class="sign-sub">Indus Industrial Supply Ltd.</div>
    </div>
    <div class="sign-box">
      <div>Carrier / Driver Sign</div>
      <div class="sign-sub">${dispatch.driver_name || 'Transport Carrier'}</div>
    </div>
    <div class="sign-box">
      <div>Consignee Receiver</div>
      <div class="sign-sub">Stamp & Signature on Delivery</div>
    </div>
  </div>
</body>
</html>`;

  return htmlContent;
}

/**
 * Triggers clean, direct Delivery Challan file download without blank tabs
 */
export function downloadDeliveryChallan(dispatch) {
  if (!dispatch) return;
  const htmlContent = generateDeliveryChallanHtml(dispatch);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Challan_${dispatch.dispatch_number || 'DSP'}.html`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
}

/**
 * Cleanly triggers the browser Print / Save as PDF dialog for Delivery Challan without leaving the page
 */
export function printDeliveryChallan(dispatch) {
  if (!dispatch) return;
  const htmlContent = generateDeliveryChallanHtml(dispatch);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 300);
  }
}
