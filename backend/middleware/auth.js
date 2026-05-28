const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Malformed authorization token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwttokenmedicarepro2026');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

authMiddleware.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const { role } = req.user;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Access denied: insufficient role' });
    }
    next();
  };
};

module.exports = authMiddleware;

