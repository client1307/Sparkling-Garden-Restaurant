import { createContext, useContext, useState, useMemo, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        try {
            const saved = sessionStorage.getItem('sparkling_cart');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            sessionStorage.setItem('sparkling_cart', JSON.stringify(cartItems));
        } catch (e) {
            console.error('Failed to persist cart:', e);
        }
    }, [cartItems]);

    const addToCart = (product) => {
        const productId = product._id || product.id;
        const priceNum = Number(product.price) || parseFloat(product.price) || 0;

        setCartItems(prev => {
            const existing = prev.find(item => (item._id || item.id) === productId);
            if (existing) {
                return prev.map(item =>
                    (item._id || item.id) === productId ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, price: priceNum, quantity: 1, id: productId }];
        });
    };

    const removeFromCart = (id) => {
        setCartItems(prev => prev.filter(item => (item._id || item.id) !== id));
    };

    const updateQuantity = (id, delta) => {
        setCartItems(prev => prev.map(item => {
            if ((item._id || item.id) === id) {
                const newQty = item.quantity + delta;
                if (newQty < 1) return item;
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const clearCart = () => {
        setCartItems([]);
        try {
            sessionStorage.removeItem('sparkling_cart');
        } catch (e) {}
    };

    const total = useMemo(() => {
        return cartItems.reduce((sum, item) => {
            const p = Number(item.price) || parseFloat(item.price) || 0;
            const q = Number(item.quantity) || 1;
            return sum + (p * q);
        }, 0);
    }, [cartItems]);

    const totalItems = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    }, [cartItems]);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, total, totalItems }}>
            {children}
        </CartContext.Provider>
    );
};
