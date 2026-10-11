import { createContext, useState, useContext } from 'react';
import { logoutUser } from '../api/api';

const AuthContext = createContext();

function AuthProvider({ children }) {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

    const login = (userData, token) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
    };

    const logout = async () => {
        try { await logoutUser(); } catch {}
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const updateUserData = (newData) => {
        const updated = { ...user, ...newData };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUserData }}>
            {children}
        </AuthContext.Provider>
    );
}

const useAuth = () => useContext(AuthContext);

export { AuthProvider, useAuth };