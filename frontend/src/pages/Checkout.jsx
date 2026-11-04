import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StoreLayout from '../components/StoreLayout.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { useStore } from '../context/StoreContext.jsx';
import api, { getErrorMessage } from '../services/api.js';
import './Checkout.css';

const initialAddress = { fullName: '', email: '', phone: '', address: '', city: '', postalCode: '', country: '' };

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function fmt(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function Checkout() {
  const { cart, products, currentUser, clearCart } = useStore();
  const [shippingAddress, setShippingAddress] = useState({
    ...initialAddress,
    fullName: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [razorpayAvailable, setRazorpayAvailable] = useState(false);

  const cartItems = cart
    .map((item) => ({ ...item, product: products.find((p) => p.id === item.productId) }))
    .filter((item) => item.product);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Check if Razorpay is configured by hitting the health endpoint
  useEffect(() => {
    api.get('/health').then(({ data }) => {
      if (data.razorpayConfigured) setRazorpayAvailable(true);
    }).catch(() => {});
  }, []);

  function updateAddress(e) {
    setShippingAddress((c) => ({ ...c, [e.target.name]: e.target.value }));
  }

  async function placeOrder(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/orders', {
        items: cart.map(({ productId, quantity }) => ({ productId, quantity })),
        shippingAddress,
        paymentMethod,
      });
      const order = data.order;

      if (paymentMethod === 'razorpay') {
        const loaded = await loadRazorpayScript();
        if (!loaded) { setError('Failed to load payment gateway. Please try cash on delivery.'); setBusy(false); return; }

        const { data: rzpData } = await api.post('/payment/create-order', { orderId: order._id });

        await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: rzpData.keyId,
            amount: rzpData.amount,
            currency: rzpData.currency,
            order_id: rzpData.razorpayOrderId,
            name: 'GYMZONE',
            description: 'Order Payment',
            prefill: { name: shippingAddress.fullName, email: shippingAddress.email, contact: shippingAddress.phone },
            theme: { color: '#ff6b00' },
            handler: async (response) => {
              try {
                await api.post('/payment/verify', {
                  orderId: order._id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                resolve();
              } catch (verifyErr) {
                reject(new Error(getErrorMessage(verifyErr, 'Payment verification failed.')));
              }
            },
            modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
          });
          rzp.open();
        });
      }

      setPlacedOrder(order);
      clearCart();
    } catch (err) {
      setError(getErrorMessage(err, 'The order was not placed. Please check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  }

  if (placedOrder) {
    return (
      <StoreLayout>
        <main className="checkout-page content-width">
          <section className="checkout-success">
            <p className="section-eyebrow">ORDER RECEIVED</p>
            <h1>YOU&apos;RE IN.</h1>
            <p>Order <strong>{placedOrder._id}</strong> is confirmed.{' '}
              {placedOrder.paymentMethod === 'razorpay'
                ? 'Payment received online.'
                : 'Cash on delivery is due when your order arrives.'}
            </p>
            <Link className="button button-orange" to="/orders">VIEW MY ORDERS</Link>
          </section>
        </main>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <main className="checkout-page content-width">
        <p className="section-eyebrow">SECURE ORDER DETAILS</p>
        <h1>CHECKOUT<span>.</span></h1>
        {!cartItems.length ? (
          <section className="checkout-empty"><h2>YOUR BAG IS EMPTY.</h2><Link className="button button-orange" to="/products">SHOP PRODUCTS</Link></section>
        ) : (
          <div className="checkout-layout">
            <form className="checkout-form" onSubmit={placeOrder}>
              <h2>DELIVERY ADDRESS</h2>
              <div className="checkout-fields">
                {[
                  ['fullName', 'Full name', 'text', 'name'],
                  ['email', 'Email address', 'email', 'email'],
                  ['phone', 'Phone number', 'tel', 'tel'],
                  ['address', 'Street address', 'text', 'street-address'],
                  ['city', 'City', 'text', 'address-level2'],
                  ['postalCode', 'Postal code', 'text', 'postal-code'],
                  ['country', 'Country', 'text', 'country-name'],
                ].map(([name, label, type, autoComplete]) => (
                  <label key={name}>{label}<input name={name} type={type} autoComplete={autoComplete} value={shippingAddress[name]} onChange={updateAddress} required /></label>
                ))}
              </div>

              <div className="payment-choice">
                <strong>PAYMENT METHOD</strong>
                <label className="payment-option">
                  <input type="radio" name="paymentMethod" value="cash_on_delivery" checked={paymentMethod === 'cash_on_delivery'} onChange={() => setPaymentMethod('cash_on_delivery')} />
                  Cash on Delivery
                  <small>No payment collected online. Pay when your order arrives.</small>
                </label>
                {razorpayAvailable && (
                  <label className="payment-option">
                    <input type="radio" name="paymentMethod" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} />
                    Pay Online (UPI / Card / Net Banking)
                    <small>Secure payment via Razorpay. Supports UPI, debit/credit cards, net banking and wallets.</small>
                  </label>
                )}
              </div>

              {error && <p className="form-message form-error" role="alert">{error}</p>}
              <button className="button button-orange" type="submit" disabled={busy}>
                {busy ? 'PROCESSING…' : paymentMethod === 'razorpay' ? 'PAY NOW' : 'PLACE CASH-ON-DELIVERY ORDER'}
              </button>
            </form>

            <aside className="checkout-summary">
              <h2>YOUR ORDER</h2>
              {cartItems.map(({ product, quantity }) => (
                <div className="checkout-item" key={product.id}>
                  <ProductImage product={product} />
                  <span>{product.name} × {quantity}</span>
                  <strong>{fmt(product.price * quantity)}</strong>
                </div>
              ))}
              <p className="checkout-total"><span>Subtotal</span><strong>{fmt(subtotal)}</strong></p>
              <p className="checkout-disclaimer">Final order stock and prices are checked by the server before the order is saved.</p>
            </aside>
          </div>
        )}
      </main>
    </StoreLayout>
  );
}

export default Checkout;
