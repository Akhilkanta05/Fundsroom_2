function errorHandler(err, req, res, next) {
  console.error('Unhandled API error:', err);

  // PostgreSQL unique violation error code: 23505
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Conflict: A record with this unique identifier already exists.',
      detail: err.detail,
    });
  }

  // PostgreSQL check constraint violation error code: 23514
  if (err.code === '23514') {
    return res.status(400).json({
      error: 'Constraint violation: Database check constraint failed.',
      detail: err.detail || err.message,
    });
  }

  // PostgreSQL foreign key violation error code: 23503
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Foreign key violation: Referenced record does not exist or is in use.',
      detail: err.detail || err.message,
    });
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
  });
}

module.exports = {
  errorHandler,
};
