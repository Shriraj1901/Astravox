const isProduction = process.env.NODE_ENV === 'production';

// Production runs the frontend and API on different sites over HTTPS, which
// needs SameSite=None + Secure. Local dev is plain http://localhost, where a
// Secure cookie is rejected by some browsers, so it uses Lax instead.
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
};

module.exports = { refreshCookieOptions };
