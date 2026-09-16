import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  FileText, 
  Receipt, 
  ShoppingCart, 
  Truck, 
  Boxes, 
  LogOut, 
  ArrowLeftRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenInventory }) {
  const { user, logout, quickLogin, isAdmin } = useAuth();

  const handleSwitchRole = async () => {
    const targetRole = isAdmin ? 'SALES' : 'ADMIN';
    await quickLogin(targetRole);
  };

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Building2 size={24} color="#60a5fa" />
        <div>
          <span>INDUS</span> ERP
        </div>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-link ${activeTab === 'enquiries' ? 'active' : ''}`}
          onClick={() => setActiveTab('enquiries')}
        >
          <FileText size={16} />
          1. Enquiries
        </button>

        <button
          className={`nav-link ${activeTab === 'quotations' ? 'active' : ''}`}
          onClick={() => setActiveTab('quotations')}
        >
          <Receipt size={16} />
          2. Quotations
        </button>

        <button
          className={`nav-link ${activeTab === 'sales-orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales-orders')}
        >
          <ShoppingCart size={16} />
          3. Sales Orders
        </button>

        <button
          className={`nav-link ${activeTab === 'dispatches' ? 'active' : ''}`}
          onClick={() => setActiveTab('dispatches')}
        >
          <Truck size={16} />
          4. Dispatches
        </button>
      </nav>

      <div className="nav-user">
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenInventory}
          title="Inspect current physical, reserved, and available stock"
        >
          <Boxes size={15} color="#2563eb" />
          Live Stock
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`badge ${isAdmin ? 'badge-role-admin' : 'badge-role-sales'}`}>
            {isAdmin ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
            {user?.role}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>
            {user?.fullName?.split(' ')[0]}
          </span>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={handleSwitchRole}
          title={`Switch to ${isAdmin ? 'Sales User' : 'Admin User'}`}
          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
        >
          <ArrowLeftRight size={13} />
          Switch to {isAdmin ? 'Sales' : 'Admin'}
        </button>

        <button
          className="btn btn-sm"
          onClick={logout}
          style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155' }}
          title="Logout"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
