const express = require('express');
const cors = require('cors');
const { setupSwagger } = require('./docs/swagger');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const customersRoutes = require('./routes/customers.routes');
const productsRoutes = require('./routes/products.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const enquiriesRoutes = require('./routes/enquiries.routes');
const quotationsRoutes = require('./routes/quotations.routes');
const salesOrdersRoutes = require('./routes/salesOrders.routes');
const dispatchesRoutes = require('./routes/dispatches.routes');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// API Documentation
setupSwagger(app);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/enquiries', enquiriesRoutes);
app.use('/api/quotations', quotationsRoutes);
app.use('/api/sales-orders', salesOrdersRoutes);
app.use('/api/dispatches', dispatchesRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
