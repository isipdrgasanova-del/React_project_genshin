import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { checkHealth } from './api/api';
import Header from './components/Header';
import Footer from './components/Footer';
import Catalog from './pages/Catalog';
import Cart from './pages/Cart';
import Coupons from './pages/Coupons';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';

function HealthCheck({ children }) {
    const [online, setOnline] = useState(true);
    useEffect(() => {
        const interval = setInterval(async () => {
            const ok = await checkHealth();
            setOnline(ok);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!online) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg)', textAlign: 'center', padding: '30px'
            }}>
                <h2 style={{ color: 'var(--accent)', fontSize: '2em' }}>Ведутся технические работы</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Сервер временно недоступен. Попробуйте через минуту.</p>
            </div>
        );
    }
    return children;
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <CartProvider>
                    <BrowserRouter>
                        <HealthCheck>
                            <Header />
                            <div style={{ padding: '30px', maxWidth: '1300px', margin: '0 auto', minHeight: '60vh' }}>
                                <Routes>
                                    <Route path="/" element={<Catalog />} />
                                    <Route path="/catalog" element={<Catalog />} />
                                    <Route path="/cart" element={<Cart />} />
                                    <Route path="/coupons" element={<Coupons />} />
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/register" element={<Register />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/admin" element={<AdminPanel />} />
                                </Routes>
                            </div>
                            <Footer />
                        </HealthCheck>
                    </BrowserRouter>
                </CartProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;