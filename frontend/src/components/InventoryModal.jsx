import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Boxes, X, RefreshCw, AlertCircle } from 'lucide-react';

export default function InventoryModal({ isOpen, onClose }) {
  const { isAdmin } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [adjustData, setAdjustData] = useState({ physical_quantity: 0, damaged_quantity: 0 });

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInventory();
      setInventory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
    }
  }, [isOpen]);

  const handleStartEdit = (item) => {
    setEditingId(item.product_id);
    setAdjustData({
      physical_quantity: item.physical_quantity,
      damaged_quantity: item.damaged_quantity,
    });
  };

  const handleSaveAdjust = async (productId) => {
    try {
      await api.updateInventory(productId, adjustData);
      setEditingId(null);
      fetchInventory();
    } catch (err) {
      alert('Error updating stock: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Boxes size={22} color="#2563eb" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Live Inventory Availability</h3>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Formula: <strong>Available = Physical − Reserved − Damaged</strong>. System strictly prevents negative available inventory.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={fetchInventory} disabled={loading}>
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

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Physical</th>
                  <th>Reserved</th>
                  <th>Damaged</th>
                  <th>Available</th>
                  {isAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {item.product_code} • ₹{Number(item.base_price).toLocaleString()} / {item.unit}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                        {item.category}
                      </span>
                    </td>
                    <td>
                      {editingId === item.product_id ? (
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: '80px', padding: '0.25rem 0.4rem' }}
                          value={adjustData.physical_quantity}
                          onChange={(e) => setAdjustData({ ...adjustData, physical_quantity: e.target.value })}
                        />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{item.physical_quantity}</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: item.reserved_quantity > 0 ? '#b45309' : '#64748b', fontWeight: 600 }}>
                        {item.reserved_quantity}
                      </span>
                    </td>
                    <td>
                      {editingId === item.product_id ? (
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: '80px', padding: '0.25rem 0.4rem' }}
                          value={adjustData.damaged_quantity}
                          onChange={(e) => setAdjustData({ ...adjustData, damaged_quantity: e.target.value })}
                        />
                      ) : (
                        <span style={{ color: item.damaged_quantity > 0 ? '#dc2626' : '#64748b' }}>
                          {item.damaged_quantity}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: item.available_quantity > 0 ? '#dcfce7' : '#fee2e2',
                          color: item.available_quantity > 0 ? '#15803d' : '#b91c1c',
                          fontSize: '0.85rem',
                          padding: '0.25rem 0.6rem',
                        }}
                      >
                        {item.available_quantity} {item.unit}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        {editingId === item.product_id ? (
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveAdjust(item.product_id)}>
                              Save
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleStartEdit(item)}
                            title="Adjust physical or damaged stock (Admin)"
                          >
                            Adjust
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
