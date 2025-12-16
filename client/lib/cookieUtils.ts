/**
 * Cookie utilities for managing JWT tokens
 * Works with the backend's HTTP-only cookies while maintaining localStorage fallback
 */

export const cookieUtils = {
  /**
   * Store token in both localStorage (for reference) and let the backend handle HTTP-only cookies
   */
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  },

  /**
   * Get token from localStorage
   * Note: HTTP-only cookies are automatically sent by the browser with credentials: 'include'
   */
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },

  /**
   * Clear token from localStorage
   * Note: HTTP-only cookies are cleared by the backend on logout
   */
  clearToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  },

  /**
   * Store user data
   */
  setUser: (user: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  /**
   * Get user data
   */
  getUser: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  /**
   * Clear user data
   */
  clearUser: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  },

  /**
   * Clear all auth data
   */
  clearAll: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('chat_history');
    }
  },
};
