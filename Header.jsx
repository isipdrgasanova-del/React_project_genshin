import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

function Header() {
    const { user, logout } = useAuth();
    const { cartItems } = useCart();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const IMAGE_AREA = 150;
    const totalCount = cartItems.reduce((s, i) => s + i.quantity, 0);
    const isAdmin = user?.role === 'admin';

    const linkStyle = ({ isActive }) => ({
        color: isActive ? '#fff' : 'var(--text)',
        background: isActive ? 'var(--accent)' : 'transparent',
        padding: '8px 16px',
        borderRadius: '12px',
        fontWeight: isActive ? 'bold' : '600',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        display: 'inline-block'
    });

    return (
        <nav style={{
            position: 'relative', minHeight: '110px',
            background: 'var(--header-gradient)',
            display: 'flex', alignItems: 'center',
            padding: '0 25px 0 0',
            paddingLeft: `${IMAGE_AREA + 5}px`,
            borderBottom: '3px solid var(--border)',
            boxShadow: '0 4px 15px var(--shadow)',
            overflow: 'hidden', transition: 'background 0.3s'
        }}>
            <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${IMAGE_AREA}px`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: 1
            }}>
                <img
                    src="http://localhost:3001/uploads/header-bg.png"
                    alt=""
                    style={{
                        maxHeight: '100px', maxWidth: `${IMAGE_AREA - 10}px`,
                        objectFit: 'contain', objectPosition: 'center', pointerEvents: 'none'
                    }}
                />
            </div>

            <div style={{
                position: 'relative', zIndex: 2, display: 'flex',
                alignItems: 'center', gap: '12px', width: '100%', flexWrap: 'wrap'
            }}>
                <h2 style={{
                    color: 'var(--accent)', margin: 0, marginRight: '15px',
                    fontSize: '1.4em', whiteSpace: 'nowrap'
                }}>
                    GenshinDonate
                </h2>

                <NavLink to="/catalog" style={linkStyle}>Каталог</NavLink>

                {user ? (
                    <>
                        {/* Корзина и Купоны скрыты для админа */}
                        {!isAdmin && (
                            <>
                                <NavLink to="/cart" style={linkStyle}>
                                    <span style={{ position: 'relative' }}>
                                        Корзина
                                        {totalCount > 0 && (
                                            <span style={{
                                                background: '#fff', color: 'var(--accent)',
                                                borderRadius: '50%', minWidth: '20px', height: '20px',
                                                display: 'inline-flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: '0.7em',
                                                fontWeight: 'bold', marginLeft: '6px',
                                                padding: '0 6px', border: '2px solid var(--accent)'
                                            }}>
                                                {totalCount}
                                            </span>
                                        )}
                                    </span>
                                </NavLink>
                                <NavLink to="/coupons" style={linkStyle}>Купоны</NavLink>
                            </>
                        )}

                        <NavLink to="/profile" style={linkStyle}>Личный кабинет</NavLink>

                        {isAdmin && (
                            <NavLink to="/admin" style={linkStyle}>Админ</NavLink>
                        )}

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: 'var(--text)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                {user.name}
                            </span>
                            <button
                                onClick={() => { logout(); navigate('/login'); }}
                                className="btn-danger"
                                style={{ padding: '8px 16px' }}
                            >
                                Выйти
                            </button>
                            <button
                                onClick={toggleTheme}
                                style={{
                                    background: 'var(--card)', color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    padding: '8px 16px', borderRadius: '12px',
                                    fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap'
                                }}
                            >
                                {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <NavLink to="/register" style={{
                            marginLeft: 'auto', color: 'var(--text)',
                            padding: '8px 16px', fontWeight: '600', whiteSpace: 'nowrap'
                        }}>
                            Регистрация
                        </NavLink>
                        <NavLink to="/login" style={linkStyle}>Войти</NavLink>
                        <button
                            onClick={toggleTheme}
                            style={{
                                background: 'var(--card)', color: 'var(--text)',
                                border: '1px solid var(--border)',
                                padding: '8px 16px', borderRadius: '12px',
                                fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap'
                            }}
                        >
                            {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}

export default Header;