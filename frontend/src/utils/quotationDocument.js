/**
 * Utility to generate and download a professional printable Commercial Quotation document
 */

export function generateQuotationHtml(quotation) {
  if (!quotation) return '';

  const items = quotation.items || [];
  const grandTotal = Number(quotation.grand_total || 0);
  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unit_price)), 0);
  const totalDiscount = items.reduce((sum, it) => {
    const base = Number(it.quantity) * Number(it.unit_price);
    return sum + (base * (Number(it.discount_percent || 0) / 100));
  }, 0);
  const totalTax = items.reduce((sum, it) => {
    const base = Number(it.quantity) * Number(it.unit_price);
    const disc = base * (Number(it.discount_percent || 0) / 100);
    return sum + ((base - disc) * (Number(it.gst_percent || 18) / 100));
  }, 0);

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Commercial Quotation - ${quotation.quotation_number}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; padding: 20px; font-size: 13px; line-height: 1.5; background: #fff; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
    .company-title { font-size: 22px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.02em; }
    .company-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 20px; color: #2563eb; font-weight: 800; text-transform: uppercase; }
    .doc-number { font-family: monospace; font-size: 14px; font-weight: 700; color: #0f172a; }
    .status-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #dcfce7; color: #15803d; text-transform: uppercase; margin-top: 4px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .section-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .client-name { font-size: 15px; font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #1e293b; color: #fff; font-size: 11px; font-weight: 700; padding: 8px 10px; text-align: left; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .summary-box { display: flex; justify-content: flex-end; margin-bottom: 25px; }
    .summary-table { width: 320px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 12px; }
    .summary-row.total { background: #eff6ff; border-top: 2px solid #2563eb; font-size: 14px; font-weight: 800; color: #1e40af; }
    .terms { background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 15px; font-size: 11px; color: #475569; margin-bottom: 30px; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
    .sign-box { text-align: center; width: 200px; border-top: 1px dashed #94a3b8; padding-top: 5px; font-weight: 600; color: #0f172a; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px 15px; border-radius: 6px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
    <span style="color: #1e40af; font-weight: 600;">Official Commercial Quotation Document Ready for Print / PDF Export</span>
    <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; font-weight: 700; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div>
      <div class="company-title">INDUS INDUSTRIAL SUPPLY LTD.</div>
      <div class="company-sub">Specialist Industrial Equipment & Heavy Engineering Components</div>
      <div class="company-sub">MIDC Industrial Area, Pune - 411018 | contact@indus-erp.internal</div>
    </div>
    <div class="doc-title">
      <h1>Commercial Quotation</h1>
      <div class="doc-number">${quotation.quotation_number}</div>
      <div><span class="status-badge">${quotation.status || 'ACCEPTED'}</span></div>
    </div>
  </div>

  <div class="details-grid">
    <div>
      <div class="section-label">Prepared For (Customer):</div>
      <div class="client-name">${quotation.company_name || 'Valued Customer'}</div>
      <div>Attn: ${quotation.contact_person || 'Procurement Team'}</div>
      <div>Mobile: ${quotation.mobile || 'N/A'} | Email: ${quotation.email || 'N/A'}</div>
      <div>Location: ${quotation.city || 'India'}</div>
    </div>
    <div>
      <div class="section-label">Quotation Details:</div>
      <div><strong>Enquiry Ref:</strong> ${quotation.enquiry_number || 'Direct'}</div>
      <div><strong>Date:</strong> ${new Date(quotation.created_at || Date.now()).toLocaleDateString()}</div>
      <div><strong>Valid Until:</strong> ${quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : '30 Days from issue'}</div>
      <div><strong>Prepared By:</strong> ${quotation.created_by_name || 'Commercial Sales Team'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;">#</th>
        <th>Product Description</th>
        <th style="text-align: right; width: 60px;">Qty</th>
        <th style="text-align: right; width: 90px;">Unit Price</th>
        <th style="text-align: right; width: 70px;">Discount</th>
        <th style="text-align: right; width: 60px;">GST %</th>
        <th style="text-align: right; width: 110px;">Line Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong>${it.product_name || `Product Code: ${it.product_code || it.product_id}`}</strong>
            ${it.product_code ? `<div style="font-size: 10px; color: #64748b; font-family: monospace;">${it.product_code} • Category: ${it.category || 'Standard'}</div>` : ''}
          </td>
          <td style="text-align: right;"><strong>${it.quantity}</strong> ${it.unit || 'PCS'}</td>
          <td style="text-align: right;">₹${Number(it.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right;">${Number(it.discount_percent || 0)}%</td>
          <td style="text-align: right;">${Number(it.gst_percent || 18)}%</td>
          <td style="text-align: right; font-weight: 700; color: #1e3a8a;">
            ₹${Number(it.line_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary-box">
    <div class="summary-table">
      <div class="summary-row">
        <span>Base Subtotal:</span>
        <strong>₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
      </div>
      <div class="summary-row" style="color: #b91c1c;">
        <span>Trade Discount:</span>
        <span>- ₹${totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="summary-row">
        <span>Taxable Value:</span>
        <strong>₹${(subtotal - totalDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
      </div>
      <div class="summary-row" style="color: #0369a1;">
        <span>Statutory GST (CGST+SGST):</span>
        <span>+ ₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="summary-row total">
        <span>Grand Total (INR):</span>
        <span>₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  </div>

  <div class="terms">
    <strong>Terms & Commercial Conditions:</strong>
    <ol style="margin-left: 18px; margin-top: 5px;">
      <li>Prices quoted are firm and inclusive of standard export-grade packaging.</li>
      <li>Payment Terms: 30 days credit following receipt of verified delivery challan.</li>
      <li>Delivery Schedule: Within 14 business days from confirmation of Sales Order.</li>
      <li>Warranty: 12 months comprehensive manufacturer warranty against manufacturing defects.</li>
    </ol>
  </div>

  <div class="footer">
    <div>
      <div>Thank you for your business!</div>
      <div style="font-size: 10px;">Generated via Indus ERP Suite | System verified timestamp: ${new Date().toISOString()}</div>
    </div>
    <div class="sign-box">
      <div>Authorized Signatory</div>
      <div style="font-size: 9px; color: #64748b; font-weight: normal;">Indus Industrial Supply Ltd.</div>
    </div>
  </div>
</body>
</html>`;

  return htmlContent;
}

/**
 * Triggers clean, direct document file download without opening blank browser tabs
 */
export function downloadQuotationDocument(quotation) {
  if (!quotation) return;
  const htmlContent = generateQuotationHtml(quotation);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Quotation_${quotation.quotation_number || 'DOC'}.html`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
}

/**
 * Cleanly triggers the browser Print / Save as PDF dialog via an invisible iframe without leaving the page
 */
export function printQuotationDocument(quotation) {
  if (!quotation) return;
  const htmlContent = generateQuotationHtml(quotation);
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
