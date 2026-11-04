import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StoreLayout from '../components/StoreLayout.jsx';
import api, { getErrorMessage } from '../services/api.js';
import './Orders.css';

const statusColors = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/mine')
      .then(({ data }) => setOrders(data.orders))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load your orders.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StoreLayout>
      <main className="orders-page content-width">
        <p className="section-eyebrow">YOUR ACCOUNT</p>
        <h1>MY ORDERS<span>.</span></h1>
        {loading && <p>Loading your orders…</p>}
        {error && <p className="form-message form-error" role="alert">{error}</p>}
        {!loading && !error && !orders.length && (
          <section className="orders-empty">
            <h2>NOTHING ORDERED YET.</h2>
            <Link className="button button-orange" to="/products">SHOP ALL GEAR</Link>
          </section>
        )}
        <div className="orders-list">
          {orders.map((order) => (
            <article className="order-card" key={order._id}>
              <header>
                <div><span>ORDER</span><strong className="order-id">{order._id}</strong></div>
                <div><span>PLACED</span><strong>{new Date(order.createdAt).toLocaleDateString()}</strong></div>
                <div>
                  <span>STATUS</span>
                  <strong className="order-status" style={{ color: statusColors[order.status] || 'inherit' }}>
                    {order.status.toUpperCase()}
                  </strong>
                </div>
                <div>
                  <span>PAYMENT</span>
                  <strong className={`order-payment ${order.paymentStatus === 'paid' ? 'paid' : ''}`}>
                    {order.paymentMethod === 'razorpay' ? 'ONLINE' : 'COD'} · {order.paymentStatus.toUpperCase()}
                  </strong>
                </div>
              </header>
              {order.items.map((item) => (
                <p className="order-line" key={item.productId}>
                  {item.name} × {item.quantity}
                  <strong>{'₹' + (item.unitPrice * item.quantity).toLocaleString('en-IN')}</strong>
                </p>
              ))}
              <p className="order-subtotal"><span>Subtotal</span><strong>{'₹' + order.subtotal.toLocaleString('en-IN')}</strong></p>
              {order.razorpayPaymentId && (
                <p className="order-payment-id"><span>Payment ID</span><code>{order.razorpayPaymentId}</code></p>
              )}
            </article>
          ))}
        </div>
      </main>
    </StoreLayout>
  );
}

export default Orders;
