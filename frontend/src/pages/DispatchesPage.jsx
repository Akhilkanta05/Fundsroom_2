import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Truck, Eye, X, RefreshCw, AlertCircle } from 'lucide-react';

export default function DispatchesPage() {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeDispatch, setActiveDispatch] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDispatches();
      setDispatches(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const viewDispatchDetails = async (id) => {
    try {
      const details = await api.apiRequest(`/dispatches/${id}`);
      setActiveDispatch(details);
    } catch (err) {
      alert('Could not fetch dispatch: ' + err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Completed Dispatches</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Historical register of dispatched consignments, transport vehicles, and driver records.
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

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Truck size={18} color="#2563eb" />
            Dispatch Log ({dispatches.length})
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Dispatch #</th>
                <th>Sales Order #</th>
                <th>Customer</th>
                <th>Vehicle Number</th>
                <th>Driver Name</th>
                <th>Dispatch Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dispatches.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No completed dispatches yet. Confirm a Sales Order and click "Dispatch" to process shipments.
                  </td>
                </tr>
              )}
              {dispatches.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#15803d' }}>
                      {d.dispatch_number}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: '#1e40af' }}>
                      {d.order_number}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{d.company_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.city}</div>
                  </td>
                  <td>
                    <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                      {d.vehicle_number}
                    </span>
                  </td>
                  <td>{d.driver_name}</td>
                  <td>{new Date(d.dispatch_date).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => viewDispatchDetails(d.id)}
                    >
                      <Eye size={13} />
                      View Items
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {activeDispatch && (
        <div className="modal-overlay" onClick={() => setActiveDispatch(null)}>
          <div className="modal-content" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Consignment: {activeDispatch.dispatch_number}
                </h3>
                <span className="badge badge-status-dispatched">DISPATCHED</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveDispatch(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Recipient Customer</div>
                  <div style={{ fontWeight: 700 }}>{activeDispatch.company_name}</div>
                  <div style={{ fontSize: '0.85rem' }}>{activeDispatch.contact_person} ({activeDispatch.mobile})</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{activeDispatch.city}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Transport Logistics</div>
                  <div><strong>Vehicle:</strong> {activeDispatch.vehicle_number}</div>
                  <div><strong>Driver:</strong> {activeDispatch.driver_name}</div>
                  <div><strong>Date:</strong> {new Date(activeDispatch.dispatch_date).toLocaleDateString()}</div>
                </div>
              </div>

              {activeDispatch.notes && (
                <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#475569', fontStyle: 'italic' }}>
                  <strong>Notes:</strong> {activeDispatch.notes}
                </div>
              )}

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.65rem' }}>
                Dispatched Consignment Items
              </h4>
              <div className="table-responsive">
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Quantity Shipped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDispatch.items?.map((it) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveDispatch(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
