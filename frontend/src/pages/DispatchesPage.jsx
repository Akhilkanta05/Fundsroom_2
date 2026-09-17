import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { downloadDeliveryChallan, printDeliveryChallan } from '../utils/deliveryChallanDocument';
import { 
  Truck, 
  Eye, 
  X, 
  RefreshCw, 
  AlertCircle, 
  Download, 
  Printer, 
  Search, 
  FileText, 
  Boxes, 
  Calendar,
  CheckCircle2
} from 'lucide-react';

export default function DispatchesPage({ targetDispatchId, onClearTargetDispatch }) {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDispatches();
      setDispatches(data);

      if (targetDispatchId) {
        viewDispatchDetails(targetDispatchId);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dispatches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetDispatchId]);

  const viewDispatchDetails = async (id) => {
    try {
      const details = await api.getDispatch(id);
      setActiveDispatch(details);
    } catch (err) {
      alert('Could not fetch dispatch: ' + err.message);
    }
  };

  const handleDownloadChallan = async (dispOrId) => {
    try {
      let disp = dispOrId;
      if (typeof dispOrId === 'number' || typeof dispOrId === 'string' || !disp.items) {
        disp = await api.getDispatch(typeof dispOrId === 'object' ? dispOrId.id : dispOrId);
      }
      downloadDeliveryChallan(disp);
    } catch (err) {
      alert('Could not download Delivery Challan: ' + err.message);
    }
  };

  const handlePrintChallan = async (dispOrId) => {
    try {
      let disp = dispOrId;
      if (typeof dispOrId === 'number' || typeof dispOrId === 'string' || !disp.items) {
        disp = await api.getDispatch(typeof dispOrId === 'object' ? dispOrId.id : dispOrId);
      }
      printDeliveryChallan(disp);
    } catch (err) {
      alert('Could not print Delivery Challan: ' + err.message);
    }
  };

  // Filtered dispatches
  const filteredDispatches = dispatches.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (d.dispatch_number && d.dispatch_number.toLowerCase().includes(term)) ||
      (d.order_number && d.order_number.toLowerCase().includes(term)) ||
      (d.company_name && d.company_name.toLowerCase().includes(term)) ||
      (d.vehicle_number && d.vehicle_number.toLowerCase().includes(term)) ||
      (d.driver_name && d.driver_name.toLowerCase().includes(term))
    );
  });

  // Calculate summary metrics
  const totalShippedUnits = dispatches.reduce((acc, d) => acc + Number(d.total_quantity_dispatched || 0), 0);
  const uniqueVehicles = new Set(dispatches.map((d) => d.vehicle_number).filter(Boolean)).size;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Completed Dispatches</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Historical register of dispatched consignments, transport vehicles, delivery challans, and gate clearances.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh Log
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Consignments Dispatched</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#065f46', marginTop: '0.25rem' }}>
            {dispatches.length}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Volume Shipped</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e40af', marginTop: '0.25rem' }}>
            {totalShippedUnits.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Units</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Transport Fleets Used</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', marginTop: '0.25rem' }}>
            {uniqueVehicles} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Vehicles</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="card-title">
            <Truck size={18} color="#059669" />
            Dispatch Log ({dispatches.length})
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '260px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search Consignment, Order, Customer, Vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.8rem', padding: '0.4rem 0.6rem 0.4rem 2rem' }}
              />
            </div>
            {searchTerm && (
              <button
                type="button"
                className="btn-icon"
                onClick={() => setSearchTerm('')}
                title="Clear filter"
                style={{ width: '28px', height: '28px' }}
              >
                <X size={14} />
              </button>
            )}
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
                <th style={{ minWidth: '220px', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDispatches.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    {dispatches.length === 0 ? (
                      <div>
                        <p style={{ fontWeight: 600, color: '#64748b', marginBottom: '0.35rem' }}>No completed dispatches yet.</p>
                        <p style={{ fontSize: '0.8rem' }}>Confirm a Sales Order and click "Dispatch" to process shipments and generate delivery challans.</p>
                      </div>
                    ) : (
                      <div>No dispatches match the search term "{searchTerm}".</div>
                    )}
                  </td>
                </tr>
              )}
              {filteredDispatches.map((d) => (
                <tr key={d.id} style={targetDispatchId === d.id ? { backgroundColor: '#f0fdf4' } : {}}>
                  <td>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#065f46' }}>
                      {d.dispatch_number}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: '#1e40af', fontWeight: 600 }}>
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
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div className="table-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => viewDispatchDetails(d.id)}
                        title="View Line Items & Log Details"
                      >
                        <Eye size={13} />
                        View
                      </button>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handlePrintChallan(d)}
                        title="Print / Save Official Delivery Challan (PDF)"
                        style={{ color: '#065f46', borderColor: '#bbf7d0' }}
                      >
                        <Printer size={13} />
                        Challan PDF
                      </button>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownloadChallan(d)}
                        title="Download Delivery Challan HTML Document"
                      >
                        <Download size={13} />
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {activeDispatch && (
        <div className="modal-overlay" onClick={() => { setActiveDispatch(null); if (onClearTargetDispatch) onClearTargetDispatch(); }}>
          <div className="modal-content" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Consignment: {activeDispatch.dispatch_number}
                </h3>
                <span className="badge badge-status-dispatched">DISPATCHED & VERIFIED</span>
              </div>
              <button className="btn-icon" onClick={() => { setActiveDispatch(null); if (onClearTargetDispatch) onClearTargetDispatch(); }} title="Close modal">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Recipient Customer</div>
                  <div style={{ fontWeight: 700 }}>{activeDispatch.company_name}</div>
                  <div style={{ fontSize: '0.85rem' }}>{activeDispatch.contact_person} ({activeDispatch.mobile})</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Destination: {activeDispatch.city}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Transport Logistics</div>
                  <div><strong>Sales Order:</strong> <span style={{ fontFamily: 'monospace', color: '#1e40af' }}>{activeDispatch.order_number}</span></div>
                  <div><strong>Vehicle:</strong> <span style={{ fontFamily: 'monospace', color: '#065f46' }}>{activeDispatch.vehicle_number}</span></div>
                  <div><strong>Driver:</strong> {activeDispatch.driver_name}</div>
                  <div><strong>Date:</strong> {new Date(activeDispatch.dispatch_date).toLocaleDateString()}</div>
                </div>
              </div>

              {activeDispatch.notes && (
                <div style={{ marginBottom: '1rem', padding: '0.65rem 0.85rem', background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', color: '#475569' }}>
                  <strong>Transport Notes:</strong> {activeDispatch.notes}
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
                      <th style={{ textAlign: 'right' }}>Quantity Shipped</th>
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
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#065f46' }}>
                          {it.quantity} {it.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => handlePrintChallan(activeDispatch)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#065f46', borderColor: '#bbf7d0' }}
                title="Print or Save Official Delivery Challan (PDF)"
              >
                <Printer size={15} />
                Print Challan (PDF)
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => handleDownloadChallan(activeDispatch)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                title="Download Delivery Challan HTML"
              >
                <Download size={15} />
                Download Challan
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => { setActiveDispatch(null); if (onClearTargetDispatch) onClearTargetDispatch(); }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
