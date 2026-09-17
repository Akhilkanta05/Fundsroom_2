import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Trash2, 
  Receipt, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  FileText, 
  AlertCircle,
  Eye,
  X
} from 'lucide-react';

export default function EnquiriesPage({ onNavigateToQuotation }) {
  const { isSales, isAdmin } = useAuth();
  const [enquiries, setEnquiries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal State for New Enquiry
  const [showModal, setShowModal] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerForm, setCustomerForm] = useState({
    company_name: '',
    contact_person: '',
    mobile: '',
    email: '',
    city: '',
  });
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 10 }]);

  // Detail Modal State
  const [activeEnquiry, setActiveEnquiry] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [enqs, custs, prods] = await Promise.all([
        api.getEnquiries(),
        api.getCustomers(),
        api.getProducts(),
      ]);
      setEnquiries(enqs);
      setCustomers(custs);
      setProducts(prods);
      if (custs.length > 0) {
        setSelectedCustomerId(custs[0].id.toString());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { product_id: products[0]?.id || '', quantity: 10 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleCreateEnquiry = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        required_date: requiredDate || null,
        notes: notes || null,
        items: items.map((it) => ({
          product_id: parseInt(it.product_id, 10),
          quantity: parseFloat(it.quantity),
        })),
      };

      if (isNewCustomer) {
        payload.customer_data = customerForm;
      } else {
        payload.customer_id = parseInt(selectedCustomerId, 10);
      }

      await api.createEnquiry(payload);
      setShowModal(false);
      // Reset form
      setNotes('');
      setRequiredDate('');
      setItems([{ product_id: products[0]?.id || '', quantity: 10 }]);
      loadData();
    } catch (err) {
      alert('Failed to create enquiry: ' + err.message);
    }
  };

  const viewEnquiryDetails = async (id) => {
    try {
      const details = await api.getEnquiry(id);
      setActiveEnquiry(details);
    } catch (err) {
      alert('Could not fetch enquiry details: ' + err.message);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'NEW': return 'badge-status-new';
      case 'QUOTED': return 'badge-status-quoted';
      case 'WON': return 'badge-status-won';
      case 'LOST': return 'badge-status-lost';
      default: return '';
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Customer Enquiries</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Capture business enquiries, customer requirements, and product line items.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Create New Enquiry
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Enquiries Table Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileText size={18} color="#2563eb" />
            All Enquiries ({enquiries.length})
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Enquiry #</th>
                <th>Customer Name</th>
                <th>City</th>
                <th>Enquiry Date</th>
                <th>Items</th>
                <th>Units Demanded</th>
                <th>Status</th>
                <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No enquiries logged yet. Click "Create New Enquiry" to get started.
                  </td>
                </tr>
              )}
              {enquiries.map((enq) => (
                <tr key={enq.id}>
                  <td>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>
                      {enq.enquiry_number}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{enq.company_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{enq.contact_person}</div>
                  </td>
                  <td>{enq.city}</td>
                  <td>{new Date(enq.enquiry_date).toLocaleDateString()}</td>
                  <td>{enq.items_count} product(s)</td>
                  <td>
                    <strong>{enq.total_units_requested}</strong> units
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(enq.status)}`}>
                      {enq.status}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div className="table-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => viewEnquiryDetails(enq.id)}
                        title="View Line Items"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onNavigateToQuotation(enq.id)}
                        title="Generate Quotation"
                      >
                        <Receipt size={14} />
                        Quote
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ENQUIRY MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Log New Customer Enquiry</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)} title="Close modal">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateEnquiry}>
              <div className="modal-body">
                {/* Customer Section */}
                <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                      Customer Selection
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsNewCustomer(!isNewCustomer)}
                    >
                      {isNewCustomer ? 'Select Existing Customer' : '+ New Customer'}
                    </button>
                  </div>

                  {!isNewCustomer ? (
                    <div className="form-group">
                      <select
                        className="form-control"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        required
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company_name} — {c.contact_person} ({c.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Company Name (e.g. Apex Industrial Ltd.)"
                          value={customerForm.company_name}
                          onChange={(e) => setCustomerForm({ ...customerForm, company_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Contact Person Name"
                          value={customerForm.contact_person}
                          onChange={(e) => setCustomerForm({ ...customerForm, contact_person: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Mobile Number"
                          value={customerForm.mobile}
                          onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="email"
                          className="form-control"
                          placeholder="Email Address"
                          value={customerForm.email}
                          onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="City"
                          value={customerForm.city}
                          onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Required Delivery Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={requiredDate}
                      onChange={(e) => setRequiredDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes / Customer Specs</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Material test certificates required"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Products List */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                      Enquired Products (Multi-item)
                    </label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItem}>
                      <Plus size={14} /> Add Product Line
                    </button>
                  </div>

                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 130px 40px',
                        gap: '0.75rem',
                        alignItems: 'center',
                        marginBottom: '0.6rem',
                      }}
                    >
                      <select
                        className="form-control"
                        value={item.product_id}
                        onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                        required
                      >
                        <option value="">-- Select Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.product_code}: {p.product_name} ({p.unit}) - Base ₹{p.base_price}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        className="form-control"
                        placeholder="Quantity"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        required
                      />

                      <button
                        type="button"
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        title="Remove row"
                      >
                        <Trash2 size={15} color={items.length <= 1 ? '#94a3b8' : '#ef4444'} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENQUIRY DETAILS MODAL */}
      {activeEnquiry && (
        <div className="modal-overlay" onClick={() => setActiveEnquiry(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Enquiry: {activeEnquiry.enquiry_number}
                </h3>
                <span className={`badge ${getStatusBadgeClass(activeEnquiry.status)}`}>
                  {activeEnquiry.status}
                </span>
              </div>
              <button className="btn-icon" onClick={() => setActiveEnquiry(null)} title="Close modal">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Customer</div>
                  <div style={{ fontWeight: 700 }}>{activeEnquiry.company_name}</div>
                  <div style={{ fontSize: '0.85rem' }}>{activeEnquiry.contact_person} ({activeEnquiry.mobile})</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{activeEnquiry.city}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Enquiry Date</div>
                  <div style={{ fontWeight: 600 }}>{new Date(activeEnquiry.enquiry_date).toLocaleDateString()}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Logged By</div>
                  <div>{activeEnquiry.created_by_name || 'Sales Rep'}</div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Demanded Products</h4>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Available Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEnquiry.items?.map((it) => (
                      <tr key={it.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{it.product_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                            {it.product_code}
                          </div>
                        </td>
                        <td>{it.category}</td>
                        <td>
                          <strong>{it.quantity}</strong> {it.unit}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: it.available_quantity >= it.quantity ? '#dcfce7' : '#fee2e2',
                              color: it.available_quantity >= it.quantity ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {it.available_quantity} available
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => {
                  const enqId = activeEnquiry.id;
                  setActiveEnquiry(null);
                  onNavigateToQuotation(enqId);
                }}
              >
                <Receipt size={16} />
                Generate Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
