const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Autenticação necessária.' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (_) {
    res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Você não tem permissão para esta ação.' });
}

module.exports = { authenticate, authorize };
