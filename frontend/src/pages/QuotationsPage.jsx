import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
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
  Trash2
} from 'lucide-react';

export default function QuotationsPage({ preselectedEnquiryId, onNavigateToSalesOrder }) {
  const { isSales, isAdmin } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // New Quotation Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState(preselectedEnquiryId || '');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState([]);

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
    setSelectedEnquiryId(enqId);
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
            quantity: it.quantity,
            unit_price: price,
            discount_percent: 0,
            gst_percent: 18,
          };
        });
        setItems(prepItems);
      }
    } catch (err) {
      console.error('Error preloading enquiry items:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [preselectedEnquiryId]);

  const handleEnquirySelect = async (e) => {
    const enqId = e.target.value;
    setSelectedEnquiryId(enqId);
    if (!enqId) return;
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
            quantity: it.quantity,
            unit_price: price,
            discount_percent: 0,
            gst_percent: 18,
          };
        });
        setItems(prepItems);
      }
    } catch (err) {
      alert('Could not fetch enquiry: ' + err.message);
    }
  };

  const handleItemFieldChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Real-time calculation preview (verified by backend upon creation)
  const calculatePreviewLine = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const disc = parseFloat(item.discount_percent) || 0;
    const gst = parseFloat(item.gst_percent) || 0;

    const base = qty * price;
    const discounted = base - base * (disc / 100);
    const tax = discounted * (gst / 100);
    return Number((discounted + tax).toFixed(2));
  };

  const previewGrandTotal = items.reduce((sum, it) => sum + calculatePreviewLine(it), 0);

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        enquiry_id: parseInt(selectedEnquiryId, 10),
        valid_until: validUntil || null,
        items: items.map((it) => ({
          product_id: parseInt(it.product_id, 10),
          quantity: parseFloat(it.quantity),
          unit_price: parseFloat(it.unit_price),
          discount_percent: parseFloat(it.discount_percent || 0),
          gst_percent: parseFloat(it.gst_percent || 18),
        })),
      };

      await api.createQuotation(payload);
      setShowModal(false);
      setItems([]);
      setSelectedEnquiryId('');
      loadData();
    } catch (err) {
      alert('Failed to create quotation: ' + err.message);
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
                <th>Actions</th>
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
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => viewQuotationDetails(q.id)}
                        title="View Line Breakdown"
                      >
                        <Eye size={13} />
                        View
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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Generate Commercial Quotation</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
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
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.75rem' }}>
                    Pricing Breakdown (Validated & Calculated on Backend)
                  </label>

                  {items.length === 0 ? (
                    <div style={{ padding: '1.5rem', background: '#f8fafc', textAlign: 'center', color: '#64748b', borderRadius: '8px' }}>
                      Please select an Enquiry above to populate products and quantities.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Unit Price (₹)</th>
                            <th>Disc %</th>
                            <th>GST %</th>
                            <th>Line Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it, idx) => {
                            const lineAmount = calculatePreviewLine(it);
                            return (
                              <tr key={idx}>
                                <td>
                                  <strong>{it.product_name || `Product ID ${it.product_id}`}</strong>
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
                                    style={{ width: '90px', padding: '0.3rem' }}
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
                                    style={{ width: '65px', padding: '0.3rem' }}
                                    value={it.discount_percent}
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    onChange={(e) => handleItemFieldChange(idx, 'discount_percent', e.target.value)}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    style={{ width: '65px', padding: '0.3rem' }}
                                    value={it.gst_percent}
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    onChange={(e) => handleItemFieldChange(idx, 'gst_percent', e.target.value)}
                                  />
                                </td>
                                <td>
                                  <strong style={{ color: '#1e40af' }}>
                                    ₹{lineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </strong>
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
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>Estimated Grand Total:</span>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Calculated from itemized base, trade discounts, and statutory taxes.
                    </p>
                  </div>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a' }}>
                    ₹{previewGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={items.length === 0}>
                  Save & Generate Quotation
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
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveQuotation(null)}>
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
