import { useCallback, useEffect, useState } from 'react';
import StoreLayout from '../components/StoreLayout.jsx';
import { useStore } from '../context/StoreContext.jsx';
import api, { getErrorMessage } from '../services/api.js';
import './AdminDashboard.css';

const emptyProduct = {
  id: '',
  name: '',
  category: 'Gym Equipment',
  brand: '',
  price: '',
  oldPrice: '',
  stock: '0',
  image: '',
  imageAlt: '',
  description: '',
  categoryLabel: '',
};
const orderStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

function AdminDashboard() {
  const { refreshProducts } = useStore();
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState('');
  const [activeTab, setActiveTab] = useState('products');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState('');

  const loadDashboard = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [productResponse, userResponse, orderResponse] = await Promise.all([
        api.get('/admin/products'),
        api.get('/admin/users'),
        api.get('/admin/orders'),
      ]);
      setProducts(productResponse.data.products);
      setUsers(userResponse.data.users);
      setOrders(orderResponse.data.orders);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load the admin dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  function updateProductField(event) {
    setProductForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function startEditing(product) {
    setEditingId(product.id);
    setProductForm({
      ...emptyProduct,
      ...product,
      price: String(product.price),
      oldPrice: product.oldPrice ? String(product.oldPrice) : '',
      stock: String(product.stock),
    });
    setActiveTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveProduct(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      oldPrice: productForm.oldPrice ? Number(productForm.oldPrice) : undefined,
      stock: Number(productForm.stock),
    };
    try {
      if (editingId) {
        await api.patch(`/admin/products/${encodeURIComponent(editingId)}`, payload);
        setMessage('Product updated.');
      } else {
        await api.post('/admin/products', payload);
        setMessage('Product added.');
      }
      setProductForm(emptyProduct);
      setEditingId('');
      await Promise.all([loadDashboard(), refreshProducts()]);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to save this product.'));
    }
  }

  async function archiveProduct(productId) {
    setError('');
    setMessage('');
    setActionBusy(productId);
    try {
      await api.delete(`/admin/products/${encodeURIComponent(productId)}`);
      setMessage('Product archived.');
      await Promise.all([loadDashboard(), refreshProducts()]);
    } catch (requestError) {
      const msg = getErrorMessage(requestError, 'Unable to archive this product.');
      setError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setActionBusy('');
    }
  }

  async function restoreProduct(productId) {
    setError('');
    setMessage('');
    setActionBusy(productId);
    try {
      await api.patch(`/admin/products/${encodeURIComponent(productId)}/restore`);
      setMessage('Product restored.');
      await Promise.all([loadDashboard(), refreshProducts()]);
    } catch (requestError) {
      const msg = getErrorMessage(requestError, 'Unable to restore this product.');
      setError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setActionBusy('');
    }
  }

  async function changeUserStatus(user) {
    setError('');
    try {
      await api.patch(`/admin/users/${user.id}/status`, { isActive: !user.isActive });
      await loadDashboard();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to update this customer.'));
    }
  }

  async function changeOrderStatus(orderId, status) {
    setError('');
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status });
      await loadDashboard();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to update this order.'));
    }
  }

  return (
    <StoreLayout>
      <main className="admin-page content-width">
        <p className="section-eyebrow">STORE OPERATIONS</p>
        <h1>ADMIN DASHBOARD<span>.</span></h1>
        {error && <p className="form-message form-error" role="alert">{error}</p>}
        {message && <p className="form-message" role="status">{message}</p>}
        <nav className="admin-tabs" aria-label="Admin sections">
          {['products', 'orders', 'users'].map((tab) => <button key={tab} className={activeTab === tab ? 'is-active' : ''} onClick={() => setActiveTab(tab)}>{tab.toUpperCase()} ({tab === 'products' ? products.length : tab === 'orders' ? orders.length : users.length})</button>)}
        </nav>
        {loading && <p className="admin-loading" role="status">Loading products, customers, and orders…</p>}

        {activeTab === 'products' && (
          <div className="admin-products">
            <form className="admin-product-form" onSubmit={saveProduct}>
              <h2>{editingId ? 'EDIT PRODUCT' : 'ADD PRODUCT'}</h2>
              <div className="admin-fields">
                <label>Product ID<input name="id" value={productForm.id} onChange={updateProductField} required disabled={Boolean(editingId)} /></label>
                <label>Name<input name="name" value={productForm.name} onChange={updateProductField} required /></label>
                <label>Brand<input name="brand" value={productForm.brand} onChange={updateProductField} required /></label>
                <label>Category<select name="category" value={productForm.category} onChange={updateProductField}><option>Gym Equipment</option><option>Accessories</option><option>Supplements</option><option>Gym Clothing</option><option>Home Gym</option></select></label>
                <label>Price<input name="price" type="number" min="0" step="0.01" value={productForm.price} onChange={updateProductField} required /></label>
                <label>Old price<input name="oldPrice" type="number" min="0" step="0.01" value={productForm.oldPrice} onChange={updateProductField} /></label>
                <label>Stock<input name="stock" type="number" min="0" step="1" value={productForm.stock} onChange={updateProductField} required /></label>
                <label>Image path<input name="image" value={productForm.image} onChange={updateProductField} placeholder="/assets/products/name.jpg" required /></label>
                <label className="admin-wide">Image alt text<input name="imageAlt" value={productForm.imageAlt} onChange={updateProductField} required /></label>
                <label className="admin-wide">Description<textarea name="description" rows="3" value={productForm.description} onChange={updateProductField} required /></label>
              </div>
              <div className="admin-form-actions"><button className="button button-orange" type="submit">{editingId ? 'SAVE PRODUCT' : 'ADD PRODUCT'}</button>{editingId && <button className="admin-secondary-button" type="button" onClick={() => { setEditingId(''); setProductForm(emptyProduct); }}>CANCEL EDIT</button>}</div>
            </form>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCT</th><th>PRICE</th><th>STOCK</th><th>STATE</th><th>ACTIONS</th></tr></thead><tbody>
              {products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.id} · {product.brand}</small></td><td>{'₹' + product.price.toLocaleString('en-IN')}</td><td>{product.stock}</td><td>{product.active ? 'Active' : 'Archived'}</td><td><button className="admin-secondary-button" onClick={() => startEditing(product)} disabled={actionBusy === product.id}>EDIT</button>{product.active ? <button className="admin-danger-button" onClick={() => archiveProduct(product.id)} disabled={actionBusy === product.id}>{actionBusy === product.id ? '…' : 'ARCHIVE'}</button> : <button className="admin-restore-button" onClick={() => restoreProduct(product.id)} disabled={actionBusy === product.id}>{actionBusy === product.id ? '…' : 'RESTORE'}</button>}</td></tr>)}
            </tbody></table></div>
          </div>
        )}

        {activeTab === 'orders' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ORDER / CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>PAYMENT</th><th>STATUS</th></tr></thead><tbody>
          {orders.map((order) => <tr key={order._id}><td><strong>{order._id}</strong><small>{order.user?.name} · {order.user?.email}</small></td><td>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</td><td>{'₹' + order.subtotal.toLocaleString('en-IN')}</td><td>{order.paymentMethod === 'razorpay' ? 'Online' : 'COD'} · {order.paymentStatus}</td><td><select value={order.status} onChange={(event) => changeOrderStatus(order._id, event.target.value)}>{orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></td></tr>)}
        </tbody></table>{!orders.length && <p className="admin-empty">No customer orders yet.</p>}</div>}

        {activeTab === 'users' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>CUSTOMER</th><th>ROLE</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
          {users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email}</small></td><td>{user.role}</td><td>{user.isActive ? 'Active' : 'Disabled'}</td><td>{user.role === 'admin' ? 'Protected' : <button className="admin-secondary-button" onClick={() => changeUserStatus(user)}>{user.isActive ? 'DISABLE' : 'ENABLE'}</button>}</td></tr>)}
        </tbody></table>{!users.length && <p className="admin-empty">No customer accounts yet.</p>}</div>}
      </main>
    </StoreLayout>
  );
}

export default AdminDashboard;
