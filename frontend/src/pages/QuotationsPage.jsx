import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { downloadQuotationDocument, printQuotationDocument } from '../utils/quotationDocument';
import { 
  Receipt, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Send, 
  ArrowRight, 
  Eye, 
  X, 
  Percent, 
  AlertCircle,
  FileCheck2,
  Trash2,
  Download,
  Printer,
  RefreshCw
} from 'lucide-react';

export default function QuotationsPage({ preselectedEnquiryId, onNavigateToSalesOrder, onClearTargetEnquiry }) {
  const { isSales, isAdmin } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // New Quotation Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState([]);
  const [modalError, setModalError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal State
  const [activeQuotation, setActiveQuotation] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [quotes, enqs, prods] = await Promise.all([
        api.getQuotations(),
        api.getEnquiries(),
        api.getProducts(),
      ]);
      setQuotations(quotes);
      setEnquiries(enqs);
      setProducts(prods);

      if (preselectedEnquiryId) {
        openModalWithEnquiry(preselectedEnquiryId, enqs, prods);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openModalWithEnquiry = async (enqId, enqList = enquiries, prodList = products) => {
    setSelectedEnquiryId(String(enqId));
    setModalError(null);
    setShowModal(true);
    try {
      const enqDetails = await api.getEnquiry(enqId);
      if (enqDetails.items && enqDetails.items.length > 0) {
        const prepItems = enqDetails.items.map((it) => {
          const matchedProd = prodList.find((p) => p.id === it.product_id);
          const price = matchedProd ? Number(matchedProd.base_price) : 1000;
          return {
            product_id: it.product_id,
            product_name: it.product_name,
            unit: it.unit,
            quantity: Number(it.quantity) || 1,
            unit_price: price,
            discount_percent: 0,
            gst_percent: 18,
          };
        });
        setItems(prepItems);
      } else if (prodList.length > 0) {
        setItems([{
          product_id: prodList[0].id,
          product_name: prodList[0].product_name,
          unit: prodList[0].unit,
          quantity: 10,
          unit_price: Number(prodList[0].base_price),
          discount_percent: 0,
          gst_percent: 18,
        }]);
      }
    } catch (err) {
      console.error('Error preloading enquiry items:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [preselectedEnquiryId]);

  const handleCloseModal = () => {
    setShowModal(false);
    setItems([]);
    setSelectedEnquiryId('');
    setValidUntil('');
    setModalError(null);
    if (onClearTargetEnquiry) {
      onClearTargetEnquiry();
    }
  };

  const handleEnquirySelect = async (e) => {
    const enqId = e.target.value;
    setSelectedEnquiryId(enqId);
    setModalError(null);
    if (!enqId) {
      setItems([]);
      return;
    }
    try {
      const enqDetails = await api.getEnquiry(enqId);
      if (enqDetails.items && enqDetails.items.length > 0) {
        const prepItems = enqDetails.items.map((it) => {
          const matchedProd = products.find((p) => p.id === it.product_id);
          const price = matchedProd ? Number(matchedProd.base_price) : 1000;
          return {
            product_id: it.product_id,
            product_name: it.product_name,
            unit: it.unit,
            quantity: Number(it.quantity) || 1,
            unit_price: price,
            discount_percent: 0,
            gst_percent: 18,
          };
        });
        setItems(prepItems);
      }
    } catch (err) {
      setModalError('Could not fetch enquiry: ' + err.message);
    }
  };

  const handleAddItemRow = () => {
    const firstProd = products[0];
    setItems([
      ...items,
      {
        product_id: firstProd ? firstProd.id : 1,
        product_name: firstProd ? firstProd.product_name : 'Item',
        unit: firstProd ? firstProd.unit : 'PCS',
        quantity: 1,
        unit_price: firstProd ? Number(firstProd.base_price) : 1000,
        discount_percent: 0,
        gst_percent: 18,
      },
    ]);
  };

  const handleRemoveItemRow = (idx) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleProductChange = (index, productId) => {
    const pId = parseInt(productId, 10);
    const matched = products.find((p) => p.id === pId);
    const updated = [...items];
    updated[index].product_id = pId;
    if (matched) {
      updated[index].product_name = matched.product_name;
      updated[index].unit = matched.unit;
      updated[index].unit_price = Number(matched.base_price);
    }
    setItems(updated);
  };

  const handleItemFieldChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Safe number parsing to prevent NaN bugs
  const safeNum = (val, fallback = 0) => {
    if (val === '' || val === null || val === undefined) return fallback;
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
  };

  const calculatePreviewLine = (item) => {
    const qty = safeNum(item.quantity, 1);
    const price = safeNum(item.unit_price, 0);
    const disc = Math.min(100, Math.max(0, safeNum(item.discount_percent, 0)));
    const gst = Math.min(100, Math.max(0, safeNum(item.gst_percent, 18)));

    const base = qty * price;
    const discounted = base - base * (disc / 100);
    const tax = discounted * (gst / 100);
    return Number((discounted + tax).toFixed(2));
  };

  const previewGrandTotal = items.reduce((sum, it) => sum + calculatePreviewLine(it), 0);

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedEnquiryId) {
      setModalError('Please select a customer enquiry reference.');
      return;
    }

    if (items.length === 0) {
      setModalError('At least one product item is required for the quotation.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        enquiry_id: parseInt(selectedEnquiryId, 10),
        valid_until: validUntil || null,
        items: items.map((it) => ({
          product_id: parseInt(it.product_id, 10),
          quantity: safeNum(it.quantity, 1),
          unit_price: safeNum(it.unit_price, 0),
          discount_percent: safeNum(it.discount_percent, 0),
          gst_percent: safeNum(it.gst_percent, 18),
        })),
      };

      await api.createQuotation(payload);
      handleCloseModal();
      loadData();
    } catch (err) {
      setModalError(err.message || 'Failed to create quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.updateQuotationStatus(id, status);
      loadData();
      if (activeQuotation && activeQuotation.id === id) {
        const refreshed = await api.getQuotation(id);
        setActiveQuotation(refreshed);
      }
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleConvertToOrder = async (quoteId) => {
    try {
      const res = await api.convertToSalesOrder(quoteId);
      alert(`Success! Generated Sales Order ${res.sales_order.order_number}`);
      loadData();
      if (onNavigateToSalesOrder) {
        onNavigateToSalesOrder(res.sales_order.id);
      }
    } catch (err) {
      alert('Failed to convert: ' + err.message);
    }
  };

  const viewQuotationDetails = async (id) => {
    try {
      const details = await api.getQuotation(id);
      setActiveQuotation(details);
    } catch (err) {
      alert('Could not fetch quotation: ' + err.message);
    }
  };

  // Download Handler for Quotation
  const handleDownloadQuotation = async (quoteOrId) => {
    try {
      let quote = quoteOrId;
      if (typeof quoteOrId === 'number' || typeof quoteOrId === 'string') {
        quote = await api.getQuotation(quoteOrId);
      } else if (!quote.items) {
        quote = await api.getQuotation(quote.id);
      }
      downloadQuotationDocument(quote);
    } catch (err) {
      alert('Could not download quotation: ' + err.message);
    }
  };

  // Direct In-Page Print / PDF Handler (No blank windows)
  const handlePrintQuotation = async (quoteOrId) => {
    try {
      let quote = quoteOrId;
      if (typeof quoteOrId === 'number' || typeof quoteOrId === 'string') {
        quote = await api.getQuotation(quoteOrId);
      } else if (!quote.items) {
        quote = await api.getQuotation(quote.id);
      }
      printQuotationDocument(quote);
    } catch (err) {
      alert('Could not print quotation: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return 'badge-status-draft';
      case 'SENT': return 'badge-status-sent';
      case 'ACCEPTED': return 'badge-status-accepted';
      case 'REJECTED': return 'badge-status-rejected';
      default: return '';
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Quotations</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Generate quotations with discounts and GST, manage acceptance lifecycle, and convert to Sales Orders.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setSelectedEnquiryId('');
            setItems([]);
            setModalError(null);
            setShowModal(true);
          }}
        >
          <Plus size={16} />
          Create Quotation
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Table Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Receipt size={18} color="#2563eb" />
            All Quotations ({quotations.length})
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Quotation #</th>
                <th>Enquiry Reference</th>
                <th>Customer Name</th>
                <th>Grand Total (₹)</th>
                <th>Status</th>
                <th>Sales Order</th>
                <th style={{ minWidth: '270px', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No quotations generated yet. Click "Create Quotation" or quote from an enquiry.
                  </td>
                </tr>
              )}
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>
                      {q.quotation_number}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: '#475569' }}>
                      {q.enquiry_number}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{q.company_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{q.contact_person}</div>
                  </td>
                  <td>
                    <strong style={{ fontSize: '0.95rem' }}>
                      ₹{Number(q.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(q.status)}`}>
                      {q.status}
                    </span>
                  </td>
                  <td>
                    {q.order_number ? (
                      <span className="badge badge-status-confirmed">
                        {q.order_number} ({q.sales_order_status})
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Not converted</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div className="table-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => viewQuotationDetails(q.id)}
                        title="View Line Breakdown"
                      >
                        <Eye size={13} />
                        View
                      </button>

                      {/* Download Quotation Feature */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownloadQuotation(q)}
                        title="Download / Print Commercial Quotation Document"
                        style={{ color: q.status === 'ACCEPTED' ? '#15803d' : '#0369a1', borderColor: q.status === 'ACCEPTED' ? '#86efac' : '#bae6fd' }}
                      >
                        <Download size={13} />
                        Download
                      </button>

                      {q.status === 'DRAFT' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleStatusUpdate(q.id, 'SENT')}
                          title="Send to Customer"
                        >
                          <Send size={13} color="#2563eb" />
                          Send
                        </button>
                      )}

                      {(q.status === 'DRAFT' || q.status === 'SENT') && (
                        <>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleStatusUpdate(q.id, 'ACCEPTED')}
                            title="Mark as Accepted"
                          >
                            <CheckCircle size={13} />
                            Accept
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleStatusUpdate(q.id, 'REJECTED')}
                            title="Mark as Rejected"
                          >
                            <XCircle size={13} />
                            Reject
                          </button>
                        </>
                      )}

                      {q.status === 'ACCEPTED' && !q.order_number && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleConvertToOrder(q.id)}
                          title="Convert Accepted Quote into Sales Order"
                        >
                          <FileCheck2 size={13} />
                          Convert to SO
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE QUOTATION MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Generate Commercial Quotation</h3>
              <button className="btn-icon" onClick={handleCloseModal} title="Close modal">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation}>
              <div className="modal-body">
                {modalError && (
                  <div className="alert alert-danger">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Customer Enquiry Reference *</label>
                    <select
                      className="form-control"
                      value={selectedEnquiryId}
                      onChange={handleEnquirySelect}
                      required
                    >
                      <option value="">-- Choose Enquiry --</option>
                      {enquiries.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.enquiry_number} — {e.company_name} ({e.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quotation Validity Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                    />
                  </div>
                </div>

                {/* Line Items Pricing Table */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                      Pricing Breakdown (Validated on Backend)
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddItemRow}
                      title="Add another product line item"
                    >
                      <Plus size={14} /> Add Product Line
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <div style={{ padding: '1.5rem', background: '#f8fafc', textAlign: 'center', color: '#64748b', borderRadius: '8px' }}>
                      Please select an Enquiry above or click "+ Add Product Line" to add items.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>Product Selection</th>
                            <th style={{ width: '80px' }}>Qty</th>
                            <th style={{ width: '110px' }}>Price (₹)</th>
                            <th style={{ width: '80px' }}>Disc %</th>
                            <th style={{ width: '80px' }}>GST %</th>
                            <th style={{ width: '120px' }}>Line Total</th>
                            <th style={{ width: '45px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it, idx) => {
                            const lineAmount = calculatePreviewLine(it);
                            return (
                              <tr key={idx}>
                                <td>
                                  <select
                                    className="form-control"
                                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                                    value={it.product_id}
                                    onChange={(e) => handleProductChange(idx, e.target.value)}
                                    required
                                  >
                                    {products.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.product_code}: {p.product_name} ({p.unit})
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    style={{ width: '70px', padding: '0.3rem' }}
                                    value={it.quantity}
                                    min="1"
                                    onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                                    required
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    style={{ width: '95px', padding: '0.3rem' }}
                                    value={it.unit_price}
                                    min="0"
                                    step="0.01"
                                    onChange={(e) => handleItemFieldChange(idx, 'unit_price', e.target.value)}
                                    required
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    style={{ width: '70px', padding: '0.3rem' }}
                                    value={it.discount_percent}
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    onChange={(e) => handleItemFieldChange(idx, 'discount_percent', e.target.value)}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    style={{ width: '70px', padding: '0.3rem' }}
                                    value={it.gst_percent}
                                    min="0"
                                    max="100"
                                    step="1"
                                    onChange={(e) => handleItemFieldChange(idx, 'gst_percent', e.target.value)}
                                  />
                                </td>
                                <td>
                                  <strong style={{ color: '#1e40af' }}>
                                    ₹{lineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </strong>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn-icon btn-icon-danger"
                                    onClick={() => handleRemoveItemRow(idx)}
                                    disabled={items.length <= 1}
                                    title="Remove row"
                                  >
                                    <Trash2 size={15} color={items.length <= 1 ? '#94a3b8' : '#ef4444'} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Grand Total Summary Box */}
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 700 }}>Computed Grand Total:</span>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Calculated from base rate, trade discounts, and statutory taxes.
                    </p>
                  </div>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a' }}>
                    ₹{previewGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || items.length === 0}>
                  {submitting ? 'Generating Quotation...' : 'Save & Generate Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUOTATION DETAILS MODAL */}
      {activeQuotation && (
        <div className="modal-overlay" onClick={() => setActiveQuotation(null)}>
          <div className="modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Quotation: {activeQuotation.quotation_number}
                </h3>
                <span className={`badge ${getStatusBadge(activeQuotation.status)}`}>
                  {activeQuotation.status}
                </span>
              </div>
              <button className="btn-icon" onClick={() => setActiveQuotation(null)} title="Close modal">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Customer</div>
                  <div style={{ fontWeight: 700 }}>{activeQuotation.company_name}</div>
                  <div style={{ fontSize: '0.85rem' }}>{activeQuotation.contact_person} • {activeQuotation.city}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Linked Enquiry</div>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{activeQuotation.enquiry_number}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>Valid Until: {activeQuotation.valid_until ? new Date(activeQuotation.valid_until).toLocaleDateString() : 'Open'}</div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Itemized Breakdown</h4>
              <div className="table-responsive">
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Discount</th>
                      <th>GST</th>
                      <th>Line Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeQuotation.items?.map((it) => (
                      <tr key={it.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{it.product_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{it.product_code}</div>
                        </td>
                        <td>{it.quantity} {it.unit}</td>
                        <td>₹{Number(it.unit_price).toLocaleString()}</td>
                        <td>{it.discount_percent}%</td>
                        <td>{it.gst_percent}%</td>
                        <td>
                          <strong>₹{Number(it.line_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ textAlign: 'right', marginTop: '1rem', paddingRight: '1rem' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Grand Total: </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af', marginLeft: '0.5rem' }}>
                  ₹{Number(activeQuotation.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              {/* Printable Download Action in Modal */}
              <button
                className="btn btn-secondary"
                onClick={() => handlePrintQuotation(activeQuotation)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                title="Print or Save as PDF directly without leaving the page"
              >
                <Printer size={15} />
                Print / Save PDF
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => handleDownloadQuotation(activeQuotation)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                title="Download commercial quotation file"
              >
                <Download size={15} />
                Download HTML
              </button>

              {activeQuotation.status === 'ACCEPTED' && !activeQuotation.order_number && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const quoteId = activeQuotation.id;
                    setActiveQuotation(null);
                    handleConvertToOrder(quoteId);
                  }}
                >
                  <FileCheck2 size={16} />
                  Convert to Sales Order
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setActiveQuotation(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
