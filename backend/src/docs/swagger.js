const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Industrial ERP System API',
    version: '1.0.0',
    description: `Complete REST API for the B2B Manufacturing & Supply ERP workflow:
Customer Enquiry -> Quotation -> Sales Order -> Inventory Reservation -> Dispatch.`,
    contact: {
      name: 'Engineering Team',
      email: 'dev@fundsroom.internal',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token in Authorization header: Bearer <token>',
      },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@erp.com' },
          password: { type: 'string', example: 'Admin@123' },
        },
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          company_name: { type: 'string', example: 'ABC Engineering Pvt. Ltd.' },
          contact_person: { type: 'string', example: 'Vikram Mehta' },
          mobile: { type: 'string', example: '+91 98765 43210' },
          email: { type: 'string', example: 'procurement@abceng.com' },
          city: { type: 'string', example: 'Pune' },
        },
      },
      EnquiryRequest: {
        type: 'object',
        required: ['customer_id', 'items'],
        properties: {
          customer_id: { type: 'integer', example: 1 },
          required_date: { type: 'string', format: 'date', example: '2026-10-01' },
          notes: { type: 'string', example: 'Urgent supply for new project' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['product_id', 'quantity'],
              properties: {
                product_id: { type: 'integer', example: 1 },
                quantity: { type: 'number', example: 100 },
              },
            },
          },
        },
      },
      QuotationRequest: {
        type: 'object',
        required: ['enquiry_id', 'items'],
        properties: {
          enquiry_id: { type: 'integer', example: 1 },
          valid_until: { type: 'string', format: 'date', example: '2026-10-15' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['product_id', 'quantity', 'unit_price'],
              properties: {
                product_id: { type: 'integer', example: 1 },
                quantity: { type: 'number', example: 100 },
                unit_price: { type: 'number', example: 4500 },
                discount_percent: { type: 'number', example: 5 },
                gst_percent: { type: 'number', example: 18 },
              },
            },
          },
        },
      },
      QuotationStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'],
            example: 'ACCEPTED',
          },
        },
      },
      DispatchRequest: {
        type: 'object',
        required: ['vehicle_number', 'driver_name'],
        properties: {
          vehicle_number: { type: 'string', example: 'MH-12-AB-9876' },
          driver_name: { type: 'string', example: 'Ramesh Patil' },
          notes: { type: 'string', example: 'Loaded in truck 3, all seals intact' },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'User Login',
        description: 'Authenticates user credentials and returns a JWT token.',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'Login successful with JWT token' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Current User Profile',
        description: 'Returns authenticated user details.',
        responses: { 200: { description: 'Authenticated user payload' } },
      },
    },
    '/customers': {
      get: {
        summary: 'List Customers',
        responses: { 200: { description: 'Array of customers' } },
      },
      post: {
        summary: 'Create Customer',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } },
        },
        responses: { 201: { description: 'Customer created' } },
      },
    },
    '/products': {
      get: {
        summary: 'List Products Master',
        responses: { 200: { description: 'List of industrial products' } },
      },
    },
    '/inventory': {
      get: {
        summary: 'List Inventory Availability',
        description: 'Returns products with physical, reserved, damaged, and calculated available quantities.',
        responses: { 200: { description: 'Inventory stock availability' } },
      },
    },
    '/enquiries': {
      get: {
        summary: 'List Enquiries',
        responses: { 200: { description: 'List of customer enquiries' } },
      },
      post: {
        summary: 'Create Customer Enquiry',
        description: 'Create enquiry with multiple product requirements.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/EnquiryRequest' } } },
        },
        responses: { 201: { description: 'Enquiry created' } },
      },
    },
    '/enquiries/{id}': {
      get: {
        summary: 'Get Enquiry Details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Enquiry details with line items' } },
      },
    },
    '/quotations': {
      get: {
        summary: 'List Quotations',
        responses: { 200: { description: 'List of quotations' } },
      },
      post: {
        summary: 'Create Quotation',
        description: 'Generates quotation against enquiry. Financial totals validated and calculated by backend.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/QuotationRequest' } } },
        },
        responses: { 201: { description: 'Quotation created with calculated totals' } },
      },
    },
    '/quotations/{id}/status': {
      patch: {
        summary: 'Update Quotation Status',
        description: 'Transition status: DRAFT -> SENT -> ACCEPTED / REJECTED.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/QuotationStatusRequest' } } },
        },
        responses: { 200: { description: 'Quotation status updated' } },
      },
    },
    '/quotations/{id}/convert': {
      post: {
        summary: 'Convert Accepted Quotation to Sales Order',
        description: 'Enforces that only ACCEPTED quotations can be converted. Prevents duplicate orders.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          201: { description: 'Sales Order created' },
          400: { description: 'Quotation is DRAFT or REJECTED' },
          409: { description: 'Sales Order already exists for this quotation' },
        },
      },
    },
    '/sales-orders': {
      get: {
        summary: 'List Sales Orders',
        responses: { 200: { description: 'List of sales orders' } },
      },
    },
    '/sales-orders/{id}/confirm': {
      post: {
        summary: 'Confirm Sales Order & Reserve Inventory (Admin Only)',
        description: 'Concurrency-safe transactional stock reservation using row-level locking. Physical stock does not decrease; Reserved stock increases.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Order confirmed and inventory reserved' },
          400: { description: 'Insufficient stock or invalid status' },
          403: { description: 'Forbidden: Admin role required' },
        },
      },
    },
    '/sales-orders/{id}/dispatch': {
      post: {
        summary: 'Process Order Dispatch (Admin Only)',
        description: 'Reduces both physical and reserved inventory atomically. Creates dispatch record with vehicle and driver info.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DispatchRequest' } } },
        },
        responses: {
          201: { description: 'Dispatch successful and inventory deducted' },
          400: { description: 'Order not confirmed or missing dispatch fields' },
          403: { description: 'Forbidden: Admin role required' },
        },
      },
    },
  },
};

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/api-docs.json', (req, res) => res.json(swaggerDocument));
}

module.exports = {
  setupSwagger,
  swaggerDocument,
};
