const jwt = require('jsonwebtoken');
const User = require('../models/User');

// req.user is returned to the client by GET /auth/profile, so it must never
// carry secrets (password hash, reset/verification tokens) or the resume text.
const PUBLIC_USER_FIELDS =
  '-password -resetPasswordToken -resetPasswordExpires -verificationToken -resume';

const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }

  // A database failure here is a 500 (via the error handler), not a 401 —
  // otherwise a brief outage would log every user out.
  req.user = await User.findById(decoded.id).select(PUBLIC_USER_FIELDS);

  if (!req.user) {
    return res.status(401).json({ message: 'User not found' });
  }

  next();
};

module.exports = { protect };
