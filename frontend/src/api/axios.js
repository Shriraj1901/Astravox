import axios from 'axios';

const TOKEN_KEY = 'astravox_token';
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Access tokens last 15 minutes; the refresh cookie renews them silently.
// One shared promise so parallel 401s trigger a single refresh call.
let refreshing = null;
export const refreshAccessToken = () => {
  refreshing ??= axios
    .post(`${baseURL}/auth/refresh`, null, { withCredentials: true })
    .then((res) => {
      localStorage.setItem(TOKEN_KEY, res.data.token);
      return res.data.token;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // Wrong credentials on these routes are a normal 401, not an expired session.
    const isAuthCall = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout'].includes(
      original?.url
    );

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        await refreshAccessToken();
        return api(original);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new Event('astravox:session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
