import { ArrowRight, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext.jsx';
import Navbar from './Navbar.jsx';

function StoreLayout({ children }) {
  const store = useStore();

  return (
    <div className="storefront">
      <div className="announcement">
        <span>YOUR NEXT REP STARTS HERE</span>
        <span className="announcement-divider">/</span>
        <span>FREE SHIPPING ON ORDERS OVER $100</span>
        <Link to="/products">SHOP THE DROP <ArrowRight size={13} /></Link>
      </div>
      <Navbar
        theme={store.theme}
        onToggleTheme={store.toggleTheme}
        cartCount={store.cartCount}
        search={store.search}
        onSearch={store.setSearch}
        currentUser={store.currentUser}
        onSignOut={store.signOut}
      />
      {store.catalogError && <p className="api-status" role="status">{store.catalogError}</p>}
      {children}
      <footer className="footer" id="footer">
        <div className="footer-main content-width">
          <div className="footer-brand">
            <Link className="wordmark" to="/"><span className="wordmark-icon">G</span> GYMZONE<span className="wordmark-dot">.</span></Link>
            <p>Built for the work.<br />Ready for whatever&apos;s next.</p>
            <a className="social-link" href="#footer" aria-label="GYMZONE on Instagram"><Instagram size={19} /></a>
          </div>
          <div className="footer-column">
            <h3>SHOP</h3>
            <Link to="/products?category=Gym%20Equipment">Equipment</Link>
            <Link to="/products?category=Accessories">Accessories</Link>
            <Link to="/products?category=Supplements">Supplements</Link>
            <Link to="/products?sort=newest">New arrivals</Link>
          </div>
          <div className="footer-column">
            <h3>GYMZONE</h3>
            <Link to="/">Our story</Link>
            <Link to="/products">Training gear</Link>
            <Link to="/products?category=Home%20Gym">Home gym</Link>
            <a href="mailto:hello@gymzone.example">Get in touch</a>
          </div>
          <div className="footer-newsletter">
            <h3>GET IN THE ZONE.</h3>
            <p>New gear, training notes, and 10% off your first order.</p>
            <form onSubmit={(event) => event.preventDefault()}>
              <label className="visually-hidden" htmlFor="newsletter-email">Email address</label>
              <input id="newsletter-email" type="email" placeholder="Your email address" />
              <button type="submit" aria-label="Subscribe"><ArrowRight size={18} /></button>
            </form>
          </div>
        </div>
        <div className="footer-bottom content-width">
          <span>© 2026 GYMZONE. BUILT FOR THE WORK.</span>
          <div><a href="#footer">PRIVACY</a><a href="#footer">TERMS</a><span>MADE TO MOVE.</span></div>
        </div>
      </footer>
    </div>
  );
}

export default StoreLayout;
