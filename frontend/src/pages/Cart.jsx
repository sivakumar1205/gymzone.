import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import ProductImage from '../components/ProductImage.jsx';
import StoreLayout from '../components/StoreLayout.jsx';
import { useStore } from '../context/StoreContext.jsx';
import './Cart.css';

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function Cart() {
  const { cart, updateCartQuantity, removeFromCart, products } = useStore();
  const cartItems = cart
    .map((item) => ({ ...item, product: products.find((p) => p.id === item.productId) }))
    .filter((item) => item.product);
  const subtotal = cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);

  return (
    <StoreLayout>
      <main className="cart-page content-width">
        <p className="section-eyebrow">YOUR TRAINING GEAR</p>
        <h1>YOUR BAG<span>.</span></h1>
        {cartItems.length ? (
          <div className="cart-layout">
            <section className="cart-items" aria-label="Items in your shopping bag">
              {cartItems.map(({ product, quantity }) => (
                <article className="cart-item" key={product.id}>
                  <Link className="cart-item-image" to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
                    <ProductImage product={product} />
                  </Link>
                  <div className="cart-item-info">
                    <p className="section-eyebrow">{product.category}</p>
                    <h2><Link to={`/products/${product.id}`}>{product.name}</Link></h2>
                    <p className={`product-stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                      {product.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
                    </p>
                    <div className="cart-item-controls">
                      <div className="quantity-control">
                        <button onClick={() => updateCartQuantity(product.id, quantity - 1)} aria-label={`Decrease ${product.name} quantity`}><Minus size={14} /></button>
                        <output aria-live="polite">{quantity}</output>
                        <button onClick={() => updateCartQuantity(product.id, quantity + 1)} aria-label={`Increase ${product.name} quantity`} disabled={quantity >= product.stock}><Plus size={14} /></button>
                      </div>
                      <button className="cart-remove" onClick={() => removeFromCart(product.id)}><Trash2 size={14} /> REMOVE</button>
                    </div>
                  </div>
                  <strong className="cart-item-price">{fmt(product.price * quantity)}</strong>
                </article>
              ))}
              <Link className="cart-continue" to="/products">CONTINUE SHOPPING <ArrowRight size={15} /></Link>
            </section>
            <aside className="cart-summary">
              <p className="section-eyebrow">THE TOTALS</p>
              <h2>ORDER SUMMARY</h2>
              <div><span>Subtotal</span><strong>{fmt(subtotal)}</strong></div>
              <div><span>Shipping</span><span>Calculated at checkout</span></div>
              <div className="cart-total"><span>Estimated total</span><strong>{fmt(subtotal)}</strong></div>
              <Link className="button button-orange cart-checkout" to="/checkout">CONTINUE TO CHECKOUT <ShoppingBag size={16} /></Link>
              <p>Pay online via Razorpay or cash on delivery at your door.</p>
            </aside>
          </div>
        ) : (
          <section className="empty-cart">
            <ShoppingBag size={38} />
            <h2>YOUR BAG IS WAITING.</h2>
            <p>Find the gear that gets you moving.</p>
            <Link className="button button-orange" to="/products">SHOP ALL GEAR <ArrowRight size={16} /></Link>
          </section>
        )}
      </main>
    </StoreLayout>
  );
}

export default Cart;
