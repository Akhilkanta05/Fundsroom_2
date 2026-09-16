import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingCart, 
  ShieldCheck, 
  Truck, 
  XCircle, 
  Eye, 
  X, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight,
  Boxes,
  Lock,
  RefreshCw,
  GitFork
} from 'lucide-react';

export default function SalesOrdersPage({ targetOrderId }) {
  const { isAdmin, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [activeOrder, setActiveOrder] = useState(null);

  // Dispatch Modal State
  const [dispatchModalOrder, setDispatchModalOrder] = useState(null);
  const [dispatchForm, setDispatchForm] = useState({
    vehicle_number: '',
    driver_name: '',
    notes: '',
  });
  const [dispatchLoading, setDispatchLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderList, invList] = await Promise.all([
        api.getSalesOrders(),
        api.getInventory(),
      ]);
      setOrders(orderList);
      setInventory(invList);

      if (targetOrderId) {
        viewOrderDetails(targetOrderId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetOrderId]);

  const viewOrderDetails = async (id) => {
    try {
      const details = await api.getSalesOrder(id);
      setActiveOrder(details);
    } catch (err) {
      alert('Could not fetch order details: ' + err.message);
    }
  };

  const handleConfirmOrder = async (orderId) => {
    if (!isAdmin) {
      alert('Forbidden: Only ADMIN users can confirm sales orders and reserve inventory.');
      return;
    }

    try {
      const res = await api.confirmSalesOrder(orderId);
      alert(res.message || 'Sales Order confirmed and stock reserved!');
      loadData();
      if (activeOrder && activeOrder.id === orderId) {
        viewOrderDetails(orderId);
      }
    } catch (err) {
      alert('Confirmation Failed: ' + err.message);
    }
  };

  const handleOpenDispatchModal = (order) => {
    if (!isAdmin) {
      alert('Forbidden: Only ADMIN users can process dispatch.');
      return;
    }
    setDispatchModalOrder(order);
    setDispatchForm({
      vehicle_number: 'MH-12-AB-9876',
      driver_name: 'Ramesh Patil',
      notes: 'Dispatched through industrial cargo express',
    });
  };

  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchModalOrder) return;
    setDispatchLoading(true);
    try {
      const res = await api.dispatchSalesOrder(dispatchModalOrder.id, dispatchForm);
      alert(`Success! Dispatched with tracking #${res.dispatch.dispatch_number}. Physical & Reserved stock updated.`);
      setDispatchModalOrder(null);
      loadData();
      if (activeOrder && activeOrder.id === dispatchModalOrder.id) {
        viewOrderDetails(dispatchModalOrder.id);
      }
    } catch (err) {
      alert('Dispatch Failed: ' + err.message);
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!isAdmin) {
      alert('Forbidden: Only ADMIN users can cancel sales orders.');
      return;
    }
    if (!window.confirm('Are you sure you want to cancel this order? Any reserved inventory will be automatically released back to stock.')) {
      return;
    }
    try {
      await api.cancelSalesOrder(orderId);
      alert('Sales order cancelled and reserved inventory released.');
      loadData();
      if (activeOrder && activeOrder.id === orderId) {
        viewOrderDetails(orderId);
      }
    } catch (err) {
      alert('Cancellation failed: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return 'badge-status-pending';
      case 'CONFIRMED': return 'badge-status-confirmed';
      case 'DISPATCHED': return 'badge-status-dispatched';
      case 'CANCELLED': return 'badge-status-cancelled';
      default: return '';
    }
  };

  return (
    <div>
      {/* Workflow Traceability Banner */}
      <div className="workflow-stepper">
        <div className="step-item active">
          <div className="step-number">1</div>
          <span>Customer & Enquiry</span>
        </div>
        <ArrowRight size={14} color="#94a3b8" />
        <div className="step-item active">
          <div className="step-number">2</div>
          <span>Accepted Quotation</span>
        </div>
        <ArrowRight size={14} color="#94a3b8" />
        <div className="step-item active">
          <div className="step-number" style={{ background: '#2563eb', color: '#fff' }}>3</div>
          <span style={{ color: '#2563eb', fontWeight: 700 }}>Sales Order</span>
        </div>
        <ArrowRight size={14} color="#94a3b8" />
        <div className="step-item">
          <div className="step-number">4</div>
          <span>Stock Reservation</span>
        </div>
        <ArrowRight size={14} color="#94a3b8" />
        <div className="step-item">
          <div className="step-number">5</div>
          <span>Dispatch</span>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Sales Orders & Dispatch</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Confirmed orders automatically reserve inventory. Physical stock deducts only upon dispatch.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Quick Stock Snapshot Bar */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '1rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Boxes size={20} color="#2563eb" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Live Stock Snapshot:</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {inventory.slice(0, 4).map((p) => (
            <div key={p.id} style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 600 }}>{p.product_code}: </span>
              <span style={{ color: '#15803d', fontWeight: 700 }}>{p.available_quantity} Avail</span>
              <span style={{ color: '#64748b' }}> ({p.physical_quantity} Phys / {p.reserved_quantity} Res)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ShoppingCart size={18} color="#2563eb" />
            All Sales Orders ({orders.length})
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Quote Reference</th>
                <th>Customer</th>
                <th>Total Value (₹)</th>
                <th>Order Date</th>
                <th>Status</th>
                <th>Dispatch Tracking</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No Sales Orders yet. Go to Quotations, Accept a quote, and convert it to a Sales Order!
                  </td>
                </tr>
              )}
              {orders.map((so) => (
                <tr key={so.id}>
                  <td>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>
                      {so.order_number}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: '#475569' }}>
                      {so.quotation_number}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{so.company_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{so.city}</div>
                  </td>
                  <td>
                    <strong>₹{Number(so.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </td>
                  <td>{new Date(so.order_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(so.status)}`}>
                      {so.status}
                    </span>
                  </td>
                  <td>
                    {so.dispatch_number ? (
                      <div>
                        <span className="badge badge-status-dispatched">
                          {so.dispatch_number}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {so.vehicle_number} • {so.driver_name}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Pending Dispatch</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => viewOrderDetails(so.id)}
                        title="View Full Details & Traceability"
                      >
                        <Eye size={13} />
                        View
                      </button>

                      {/* CONFIRM / RESERVE STOCK (Admin Only) */}
                      {so.status === 'PENDING' && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleConfirmOrder(so.id)}
                          disabled={!isAdmin}
                          title={isAdmin ? 'Confirm order & reserve inventory' : 'Admin role required to reserve stock'}
                        >
                          {isAdmin ? <ShieldCheck size={13} /> : <Lock size={13} />}
                          Confirm & Reserve
                        </button>
                      )}

                      {/* PROCESS DISPATCH (Admin Only) */}
                      {so.status === 'CONFIRMED' && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenDispatchModal(so)}
                            disabled={!isAdmin}
                            title={isAdmin ? 'Dispatch order (deducts stock)' : 'Admin role required to dispatch'}
                          >
                            <Truck size={13} />
                            Dispatch
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancelOrder(so.id)}
                            disabled={!isAdmin}
                            title="Cancel order and release reserved stock"
                          >
                            <XCircle size={13} />
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SALES ORDER DETAIL MODAL */}
      {activeOrder && (
        <div className="modal-overlay" onClick={() => setActiveOrder(null)}>
          <div className="modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Order: {activeOrder.order_number}
                </h3>
                <span className={`badge ${getStatusBadge(activeOrder.status)}`}>
                  {activeOrder.status}
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveOrder(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Full Traceability Breadcrumb */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.85rem',
              }}>
                <GitFork size={16} color="#2563eb" />
                <span style={{ fontWeight: 600 }}>End-to-End Traceability:</span>
                <span style={{ color: '#64748b' }}>{activeOrder.company_name}</span>
                <span>→</span>
                <span style={{ fontFamily: 'monospace', color: '#1e40af' }}>{activeOrder.enquiry_number}</span>
                <span>→</span>
                <span style={{ fontFamily: 'monospace', color: '#1e40af' }}>{activeOrder.quotation_number}</span>
                <span>→</span>
                <strong style={{ fontFamily: 'monospace' }}>{activeOrder.order_number}</strong>
                {activeOrder.dispatch_number && (
                  <>
                    <span>→</span>
                    <span className="badge badge-status-dispatched">{activeOrder.dispatch_number}</span>
                  </>
                )}
              </div>

              {/* Order Info Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Customer Information</div>
                  <div style={{ fontWeight: 700 }}>{activeOrder.company_name}</div>
                  <div style={{ fontSize: '0.85rem' }}>{activeOrder.contact_person} ({activeOrder.mobile})</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{activeOrder.city}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Order Timeline</div>
                  <div>Placed: {new Date(activeOrder.order_date).toLocaleDateString()} by {activeOrder.created_by_name || 'Sales User'}</div>
                  {activeOrder.confirmed_at && (
                    <div style={{ color: '#1d4ed8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Confirmed: {new Date(activeOrder.confirmed_at).toLocaleString()} by {activeOrder.confirmed_by_name || 'Admin'}
                    </div>
                  )}
                  {activeOrder.dispatch_number && (
                    <div style={{ color: '#15803d', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Dispatched on {new Date(activeOrder.dispatch_date).toLocaleDateString()} ({activeOrder.vehicle_number})
                    </div>
                  )}
                </div>
              </div>

              {/* Items & Stock Availability Table */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.65rem' }}>
                Ordered Products & Stock Availability
              </h4>
              <div className="table-responsive">
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Order Qty</th>
                      <th>Unit Price</th>
                      <th>Line Amount</th>
                      <th>Current Avail</th>
                      <th>Physical / Reserved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrder.items?.map((it) => {
                      const isEnough = it.available_quantity >= it.quantity;
                      return (
                        <tr key={it.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{it.product_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{it.product_code}</div>
                          </td>
                          <td>
                            <strong>{it.quantity}</strong> {it.unit}
                          </td>
                          <td>₹{Number(it.unit_price).toLocaleString()}</td>
                          <td>₹{Number(it.line_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background: isEnough ? '#dcfce7' : '#fee2e2',
                                color: isEnough ? '#15803d' : '#b91c1c',
                              }}
                            >
                              {it.available_quantity} Avail
                            </span>
                          </td>
                          <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {it.physical_quantity} Phys / {it.reserved_quantity} Res
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ textAlign: 'right', marginTop: '1rem', paddingRight: '1rem' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Order Total: </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af', marginLeft: '0.5rem' }}>
                  ₹{Number(activeOrder.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              {activeOrder.status === 'PENDING' && (
                <button
                  className="btn btn-success"
                  onClick={() => handleConfirmOrder(activeOrder.id)}
                  disabled={!isAdmin}
                >
                  <ShieldCheck size={16} />
                  Confirm & Reserve Stock (Admin)
                </button>
              )}

              {activeOrder.status === 'CONFIRMED' && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const ord = activeOrder;
                    setActiveOrder(null);
                    handleOpenDispatchModal(ord);
                  }}
                  disabled={!isAdmin}
                >
                  <Truck size={16} />
                  Process Dispatch (Admin)
                </button>
              )}

              <button className="btn btn-secondary" onClick={() => setActiveOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH PROCESSING MODAL */}
      {dispatchModalOrder && (
        <div className="modal-overlay" onClick={() => setDispatchModalOrder(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={22} color="#2563eb" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Dispatch Order: {dispatchModalOrder.order_number}
                </h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setDispatchModalOrder(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch}>
              <div className="modal-body">
                <div className="alert alert-info">
                  <Boxes size={18} />
                  <div>
                    <strong>Inventory Deduction Notice:</strong>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      Dispatching decreases <strong>Physical Quantity</strong> AND decreases <strong>Reserved Quantity</strong>. Available stock remains unchanged.
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Transport Vehicle Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. MH-12-AB-9876"
                    value={dispatchForm.vehicle_number}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicle_number: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Driver Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Ramesh Patil"
                    value={dispatchForm.driver_name}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driver_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dispatch / Gate Pass Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="e.g. Container seals verified, delivery challan attached."
                    value={dispatchForm.notes}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDispatchModalOrder(null)}
                  disabled={dispatchLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={dispatchLoading}>
                  {dispatchLoading ? 'Processing...' : 'Confirm & Dispatch Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
