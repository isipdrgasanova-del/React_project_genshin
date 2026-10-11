const API_URL = 'http://localhost:3001/api';

const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
});

// --- HEALTH ---
const checkHealth = async () => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 3000);
    try {
        const res = await fetch(`${API_URL}/health`, { signal: c.signal });
        clearTimeout(t);
        return res.ok;
    } catch {
        return false;
    }
};

// --- КАТЕГОРИИ ---
const getCategories = async () => {
    const r = await fetch(`${API_URL}/categories`);
    if (!r.ok) throw new Error('Ошибка загрузки категорий');
    return r.json();
};

const getAllCategories = async () => {
    const r = await fetch(`${API_URL}/categories/all`, { headers: authHeaders() });
    if (!r.ok) throw new Error('Ошибка загрузки категорий');
    return r.json();
};

const addCategory = async (name) => {
    const r = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка добавления');
    return d;
};

const deleteCategory = async (id) => {
    const r = await fetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка удаления');
    return d;
};

// --- КАТАЛОГ ---
const getServices = async (search = '') => {
    const url = search
        ? `${API_URL}/services?search=${encodeURIComponent(search)}`
        : `${API_URL}/services`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('Ошибка загрузки каталога');
    return r.json();
};

const addService = async (data) => {
    const r = await fetch(`${API_URL}/services`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка добавления');
    return d;
};

const deleteService = async (id) => {
    const r = await fetch(`${API_URL}/services/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка удаления');
    return d;
};

// ⭐ Управление скидкой на услугу (только для админа)
const setServiceDiscount = async (id, discountPercent) => {
    const r = await fetch(`${API_URL}/services/${id}/discount`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ discountPercent })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка обновления скидки');
    return d;
};

// --- АВТОРИЗАЦИЯ ---
const loginUser = async (email, password) => {
    const r = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка входа');
    return d;
};

const logoutUser = async () => {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: authHeaders()
        });
    } catch {}
};

const registerUser = async (userData) => {
    const r = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка регистрации');
    return d;
};

const forgotPassword = async (email) => {
    const r = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка');
    return d;
};

const resetPassword = async (email, code, newPassword) => {
    const r = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка');
    return d;
};

// --- КОРЗИНА ---
const getCartFromServer = async (userId) => {
    const r = await fetch(`${API_URL}/cart/${userId}`, { headers: authHeaders() });
    if (!r.ok) throw new Error('Ошибка загрузки корзины');
    return r.json();
};

const addToCartServer = async (userId, serviceId) => {
    const r = await fetch(`${API_URL}/cart`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ userId, serviceId })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка добавления');
    return d;
};

const updateCartQuantityServer = async (cartId, quantity) => {
    const r = await fetch(`${API_URL}/cart/${cartId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ quantity })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка обновления');
    return d;
};

const removeFromCartServer = async (cartId) => {
    const r = await fetch(`${API_URL}/cart/${cartId}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    if (!r.ok) throw new Error('Ошибка удаления');
    return r.json();
};

// --- ЗАКАЗЫ ---
const createOrder = async (orderData) => {
    const r = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(orderData)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка оформления заказа');
    return d;
};

const getUserOrders = async (userId) => {
    const r = await fetch(`${API_URL}/orders/user/${userId}`, { headers: authHeaders() });
    if (!r.ok) throw new Error('Ошибка загрузки заказов');
    return r.json();
};

const getAdminOrders = async () => {
    const r = await fetch(`${API_URL}/admin/orders`, { headers: authHeaders() });
    if (!r.ok) throw new Error('Ошибка загрузки заказов');
    return r.json();
};

const updateOrderStatus = async (id, status) => {
    const r = await fetch(`${API_URL}/admin/orders/${id}/status`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка обновления статуса');
    return d;
};

// --- ИНВЕНТАРЬ ---
const getInventory = async (userId) => {
    const r = await fetch(`${API_URL}/inventory/${userId}`, { headers: authHeaders() });
    if (!r.ok) throw new Error('Ошибка загрузки инвентаря');
    return r.json();
};

// --- ПРОФИЛЬ ---
const updateUser = async (userId, userData) => {
    const r = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(userData)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка обновления');
    return d;
};

const changePassword = async (userId, oldPassword, newPassword) => {
    const r = await fetch(`${API_URL}/users/${userId}/password`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ oldPassword, newPassword })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка смены пароля');
    return d;
};

// --- ОТЗЫВЫ ---
const getReviews = async (serviceId) => {
    const r = await fetch(`${API_URL}/reviews/${serviceId}`);
    if (!r.ok) throw new Error('Ошибка загрузки отзывов');
    return r.json();
};

const addReview = async (reviewData) => {
    const r = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(reviewData)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка добавления отзыва');
    return d;
};

const getAdminReviews = async () => {
    const r = await fetch(`${API_URL}/admin/reviews`, { headers: authHeaders() });
    if (!r.ok) throw new Error('Ошибка загрузки отзывов');
    return r.json();
};

const deleteReviewAdmin = async (id) => {
    const r = await fetch(`${API_URL}/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка удаления');
    return d;
};

// --- КУПОНЫ ---
const getCoupons = async () => {
    const r = await fetch(`${API_URL}/coupons`, { headers: authHeaders() });
    if (!r.ok) throw new Error('Ошибка загрузки купонов');
    return r.json();
};

const getAdminCoupons = async () => {
    const r = await fetch(`${API_URL}/admin/coupons`, { headers: authHeaders() });
    if (!r.ok) throw new Error('Ошибка загрузки купонов');
    return r.json();
};

const createCoupon = async (data) => {
    const r = await fetch(`${API_URL}/coupons`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка создания купона');
    return d;
};

const toggleCoupon = async (id) => {
    const r = await fetch(`${API_URL}/coupons/${id}/toggle`, {
        method: 'PUT',
        headers: authHeaders()
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка');
    return d;
};

const deleteCoupon = async (id) => {
    const r = await fetch(`${API_URL}/coupons/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка удаления');
    return d;
};

const validateCoupon = async (code) => {
    const r = await fetch(`${API_URL}/coupons/validate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ code })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка проверки');
    return d;
};

// ============ ЭКСПОРТ ============
export {
    checkHealth,
    getCategories,
    getAllCategories,
    addCategory,
    deleteCategory,
    getServices,
    addService,
    deleteService,
    setServiceDiscount,
    loginUser,
    logoutUser,
    registerUser,
    forgotPassword,
    resetPassword,
    getCartFromServer,
    addToCartServer,
    updateCartQuantityServer,
    removeFromCartServer,
    createOrder,
    getUserOrders,
    getAdminOrders,
    updateOrderStatus,
    getInventory,
    updateUser,
    changePassword,
    getReviews,
    addReview,
    getAdminReviews,
    deleteReviewAdmin,
    getCoupons,
    getAdminCoupons,
    createCoupon,
    toggleCoupon,
    deleteCoupon,
    validateCoupon
};