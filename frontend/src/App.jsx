import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import InventoryModal from './components/InventoryModal';
import LoginPage from './pages/LoginPage';
import EnquiriesPage from './pages/EnquiriesPage';
import QuotationsPage from './pages/QuotationsPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import DispatchesPage from './pages/DispatchesPage';

export default function App() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('enquiries');
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  // Workflow navigation states
  const [targetEnquiryId, setTargetEnquiryId] = useState(null);
  const [targetOrderId, setTargetOrderId] = useState(null);

  if (!user) {
    return <LoginPage />;
  }

  const handleNavigateToQuotation = (enquiryId) => {
    setTargetEnquiryId(enquiryId);
    setActiveTab('quotations');
  };

  const handleNavigateToSalesOrder = (orderId) => {
    setTargetOrderId(orderId);
    setActiveTab('sales-orders');
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenInventory={() => setIsInventoryOpen(true)}
      />

      <main className="main-content">
        {activeTab === 'enquiries' && (
          <EnquiriesPage onNavigateToQuotation={handleNavigateToQuotation} />
        )}

        {activeTab === 'quotations' && (
          <QuotationsPage
            preselectedEnquiryId={targetEnquiryId}
            onNavigateToSalesOrder={handleNavigateToSalesOrder}
          />
        )}

        {activeTab === 'sales-orders' && (
          <SalesOrdersPage targetOrderId={targetOrderId} />
        )}

        {activeTab === 'dispatches' && (
          <DispatchesPage />
        )}
      </main>

      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
      />
    </div>
  );
}
