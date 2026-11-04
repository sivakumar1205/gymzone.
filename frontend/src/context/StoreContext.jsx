import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import sampleProducts from '../data/products.js';
import api, { getErrorMessage } from '../services/api.js';

const StoreContext = createContext(null);

function getSavedList(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

function getSavedUser() {
  try { return JSON.parse(localStorage.getItem('gymzone-user') || 'null'); }
  catch { return null; }
}

export function StoreProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('gymzone-theme') || 'dark');
  const [products, setProducts] = useState(sampleProducts);
  const [catalogError, setCatalogError] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('gymzone-token') || '');
  const [currentUser, setCurrentUser] = useState(getSavedUser);
  const [authReady, setAuthReady] = useState(() => !localStorage.getItem('gymzone-token'));
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gymzone-cart') || '[]');
      return Array.isArray(saved)
        ? saved.filter((i) => i && typeof i.productId === 'string' && Number.isInteger(i.quantity) && i.quantity > 0)
        : [];
    } catch { return []; }
  });
  const [wishlist, setWishlist] = useState(() => getSavedList('gymzone-wishlist'));
  const [search, setSearch] = useState('');
  const cartCount = cart.reduce((t, i) => t + i.quantity, 0);

  // Track whether we've already synced for this session to avoid loops
  const syncedRef = useRef(false);

  const refreshProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data.products);
      setCatalogError('');
      return data.products;
    } catch (error) {
      setCatalogError(getErrorMessage(error, 'The product API is unavailable. Showing the included sample catalog.'));
      throw error;
    }
  }, []);

  useEffect(() => { refreshProducts().catch(() => {}); }, [refreshProducts]);

  // Verify token on mount
  useEffect(() => {
    if (!token) { setAuthReady(true); return; }
    let active = true;
    api.get('/auth/me')
      .then(({ data }) => {
        if (active) {
          setCurrentUser(data.user);
          localStorage.setItem('gymzone-user', JSON.stringify(data.user));
        }
      })
      .catch((error) => {
        if (active && error.response?.status === 401) {
          setToken(''); setCurrentUser(null);
          localStorage.removeItem('gymzone-token');
          localStorage.removeItem('gymzone-user');
        }
      })
      .finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, [token]);

  // Sync cart + wishlist from backend once after auth is ready and user is logged in
  useEffect(() => {
    if (!authReady || !token || syncedRef.current) return;
    syncedRef.current = true;

    // Sync cart
    api.get('/cart').then(({ data }) => {
      if (data.items?.length > 0) {
        setCart(data.items);
      } else {
        // Push local cart to backend if backend is empty
        const localCart = JSON.parse(localStorage.getItem('gymzone-cart') || '[]');
        if (localCart.length > 0) {
          api.post('/cart/sync', { items: localCart }).catch(() => {});
        }
      }
    }).catch(() => {});

    // Sync wishlist
    api.get('/wishlist').then(({ data }) => {
      if (data.productIds?.length > 0) {
        setWishlist(data.productIds);
      } else {
        const localWishlist = JSON.parse(localStorage.getItem('gymzone-wishlist') || '[]');
        if (localWishlist.length > 0) {
          api.post('/wishlist/sync', { productIds: localWishlist }).catch(() => {});
        }
      }
    }).catch(() => {});
  }, [authReady, token]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('gymzone-theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('gymzone-wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { localStorage.setItem('gymzone-cart', JSON.stringify(cart)); }, [cart]);

  function saveSession(session) {
    syncedRef.current = false; // allow re-sync on new login
    setToken(session.token);
    setCurrentUser(session.user);
    setAuthReady(true);
    localStorage.setItem('gymzone-token', session.token);
    localStorage.setItem('gymzone-user', JSON.stringify(session.user));
  }

  const value = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme((c) => c === 'dark' ? 'light' : 'dark'),
    products,
    catalogError,
    refreshProducts,
    cartCount,
    cart,
    addToCart: (productId, quantity = 1) => {
      if (typeof productId !== 'string' || !Number.isInteger(quantity) || quantity < 1) return;
      const product = products.find((p) => p.id === productId);
      if (!product || product.stock < 1) return;
      setCart((current) => {
        const existing = current.find((i) => i.productId === productId);
        const next = existing
          ? current.map((i) => i.productId === productId ? { ...i, quantity: Math.min(product.stock, i.quantity + quantity) } : i)
          : [...current, { productId, quantity: Math.min(product.stock, quantity) }];
        if (localStorage.getItem('gymzone-token')) {
          api.post('/cart/add', { productId, quantity }).catch(() => {});
        }
        return next;
      });
    },
    updateCartQuantity: (productId, quantity) => {
      if (!Number.isInteger(quantity)) return;
      if (quantity < 1) {
        setCart((c) => {
          if (localStorage.getItem('gymzone-token')) api.delete(`/cart/${encodeURIComponent(productId)}`).catch(() => {});
          return c.filter((i) => i.productId !== productId);
        });
        return;
      }
      const product = products.find((p) => p.id === productId);
      if (!product || product.stock < 1) return;
      setCart((c) => {
        if (localStorage.getItem('gymzone-token')) api.patch(`/cart/${encodeURIComponent(productId)}`, { quantity }).catch(() => {});
        return c.map((i) => i.productId === productId ? { ...i, quantity: Math.min(product.stock, quantity) } : i);
      });
    },
    removeFromCart: (productId) => {
      setCart((c) => {
        if (localStorage.getItem('gymzone-token')) api.delete(`/cart/${encodeURIComponent(productId)}`).catch(() => {});
        return c.filter((i) => i.productId !== productId);
      });
    },
    clearCart: () => {
      setCart([]);
      if (localStorage.getItem('gymzone-token')) api.delete('/cart').catch(() => {});
    },
    wishlist,
    toggleWishlist: (productId) => {
      setWishlist((current) => {
        const next = current.includes(productId)
          ? current.filter((id) => id !== productId)
          : [...current, productId];
        if (localStorage.getItem('gymzone-token')) {
          api.post('/wishlist/toggle', { productId }).catch(() => {});
        }
        return next;
      });
    },
    search,
    setSearch,
    currentUser,
    authReady,
    saveSession,
    signIn: async (credentials) => {
      const { data } = await api.post('/auth/login', credentials);
      saveSession(data);
      return data.user;
    },
    signOut: () => {
      syncedRef.current = false;
      setToken(''); setCurrentUser(null);
      localStorage.removeItem('gymzone-token');
      localStorage.removeItem('gymzone-user');
    },
  }), [theme, products, catalogError, refreshProducts, cartCount, cart, wishlist, search, currentUser, authReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside StoreProvider');
  return context;
}
