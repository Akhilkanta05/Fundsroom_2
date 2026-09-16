const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fundsroom-super-secret-key-2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication token is missing',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, fullName }
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or expired token',
    });
  }
}

module.exports = {
  authenticateToken,
  JWT_SECRET,
};
