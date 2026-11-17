const rateLimit = require('express-rate-limit');

// Every request through this limiter triggers a paid model call. It is keyed
// by account, not IP, so a shared network (a campus, an office) cannot lock
// everyone out. Must run after `protect`.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user.id,
  message: { message: 'You are going a little fast. Please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { aiLimiter };
