import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../api/client';

const AuthContext = createContext(null);

const VIEW_AS_KEY = 'viewAsRole';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewAsRole, setViewAsRoleState] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedView = localStorage.getItem(VIEW_AS_KEY);
    if (savedView === 'employee') setViewAsRoleState('employee');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      auth.me()
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await auth.login({ email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, password, name) => {
    const res = await auth.register({ email, password, name });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(VIEW_AS_KEY);
    setUser(null);
    setViewAsRoleState(null);
  };

  const setViewAsRole = (role) => {
    if (role === 'employee') {
      localStorage.setItem(VIEW_AS_KEY, 'employee');
      setViewAsRoleState('employee');
    } else {
      localStorage.removeItem(VIEW_AS_KEY);
      setViewAsRoleState(null);
    }
  };

  const isAdmin = user?.role === 'admin';
  const effectiveRole = isAdmin && viewAsRole === 'employee' ? 'employee' : user?.role;
  const isEffectiveAdmin = effectiveRole === 'admin';
  const isImpersonating = isAdmin && viewAsRole === 'employee';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAdmin,
      effectiveRole,
      isEffectiveAdmin,
      isImpersonating,
      setViewAsRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
