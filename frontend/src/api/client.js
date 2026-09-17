const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      // Token invalid or expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-logout'));
    }
    const errorMessage = (data && data.error) ? data.error : (typeof data === 'string' ? data : 'API Request Failed');
    const err = new Error(errorMessage);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => apiRequest('/auth/me'),

  // Customers & Products
  getCustomers: () => apiRequest('/customers'),
  createCustomer: (customer) => apiRequest('/customers', { method: 'POST', body: JSON.stringify(customer) }),
  getProducts: () => apiRequest('/products'),
  getInventory: () => apiRequest('/inventory'),
  updateInventory: (productId, data) => apiRequest(`/inventory/${productId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Enquiries
  getEnquiries: () => apiRequest('/enquiries'),
  getEnquiry: (id) => apiRequest(`/enquiries/${id}`),
  createEnquiry: (enquiry) => apiRequest('/enquiries', { method: 'POST', body: JSON.stringify(enquiry) }),

  // Quotations
  getQuotations: () => apiRequest('/quotations'),
  getQuotation: (id) => apiRequest(`/quotations/${id}`),
  createQuotation: (quotation) => apiRequest('/quotations', { method: 'POST', body: JSON.stringify(quotation) }),
  updateQuotationStatus: (id, status) => apiRequest(`/quotations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  convertToSalesOrder: (id) => apiRequest(`/quotations/${id}/convert`, { method: 'POST' }),

  // Sales Orders & Dispatches
  getSalesOrders: () => apiRequest('/sales-orders'),
  getSalesOrder: (id) => apiRequest(`/sales-orders/${id}`),
  confirmSalesOrder: (id) => apiRequest(`/sales-orders/${id}/confirm`, { method: 'POST' }),
  dispatchSalesOrder: (id, data) => apiRequest(`/sales-orders/${id}/dispatch`, { method: 'POST', body: JSON.stringify(data) }),
  cancelSalesOrder: (id) => apiRequest(`/sales-orders/${id}/cancel`, { method: 'POST' }),

  // Dispatches list & details
  getDispatches: () => apiRequest('/dispatches'),
  getDispatch: (id) => apiRequest(`/dispatches/${id}`),

  // Fallback direct request
  apiRequest,
};
