import { createContext, useContext, useState, useEffect } from 'react';
import { loadUser, saveUser } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);

  useEffect(() => {
    setUserState(loadUser());
  }, []);

  const setUser = (profile) => {
    if (!profile) {
      setUserState(null);
      saveUser(null);
      return;
    }
    const next = {
      id: profile.id || `user-${Date.now()}`,
      name: profile.name || '',
      email: profile.email || '',
      photoURL: profile.photoURL || null,
    };
    setUserState(next);
    saveUser(next);
  };

  const signOut = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
