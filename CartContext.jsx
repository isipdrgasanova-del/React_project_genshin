import { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getCartFromServer } from '../api/api';

const CartContext = createContext();

function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            getCartFromServer(user.id).then(setCartItems).catch(() => setCartItems([]));
        } else {
            setCartItems([]);
        }
    }, [user]);

    const addToCartLocal = (service) => {
        setCartItems(prev => {
            const existing = prev.find(i => i.service_id === service.service_id);
            if (existing) {
                if (existing.quantity >= 10) return prev;
                return prev.map(i =>
                    i.service_id === service.service_id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { ...service, quantity: 1 }];
        });
    };

    const updateCartLocal = (serviceId, quantity) => {
        setCartItems(prev => prev.map(i => i.service_id === serviceId ? { ...i, quantity } : i));
    };

    const removeFromCartLocal = (serviceId) => {
        setCartItems(prev => prev.filter(i => i.service_id !== serviceId));
    };

    const clearCart = () => setCartItems([]);

    const getTotalPrice = () =>
        cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{
            cartItems, addToCartLocal, updateCartLocal,
            removeFromCartLocal, clearCart, getTotalPrice
        }}>
            {children}
        </CartContext.Provider>
    );
}

const useCart = () => useContext(CartContext);

export { CartProvider, useCart };