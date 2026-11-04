import { useState } from 'react';
import { Dumbbell, Search, ShoppingBag, Sun, Moon, UserRound, Heart, X, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar({ theme, onToggleTheme, cartCount, search, onSearch, currentUser, onSignOut }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  function submitSearch(event) {
    event.preventDefault();
    navigate(search.trim() ? `/products?search=${encodeURIComponent(search.trim())}` : '/products');
    setMobileMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="header-inner content-width">
        <Link className="site-logo" to="/" aria-label="GYMZONE home"><span className="logo-mark"><Dumbbell size={23} strokeWidth={2.5} /></span><span>GYMZONE<span className="logo-period">.</span></span></Link>
        <button className="mobile-menu-toggle icon-button" type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}>{mobileMenuOpen ? <X /> : <span className="hamburger"><i /><i /><i /></span>}</button>
        <nav className={`main-nav ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Shop categories">
          <Link to="/products?category=Gym%20Equipment" onClick={() => setMobileMenuOpen(false)}>EQUIPMENT</Link>
          <Link to="/products?category=Accessories" onClick={() => setMobileMenuOpen(false)}>ACCESSORIES</Link>
          <Link to="/products?category=Supplements" onClick={() => setMobileMenuOpen(false)}>SUPPLEMENTS</Link>
          <Link to="/products?category=Gym%20Clothing" onClick={() => setMobileMenuOpen(false)}>CLOTHING</Link>
          <Link to="/products?category=Home%20Gym" onClick={() => setMobileMenuOpen(false)}>HOME GYM</Link>
        </nav>
        <form className="header-search" role="search" onSubmit={submitSearch}>
          <Search size={16} /><label className="visually-hidden" htmlFor="product-search">Search products</label>
          <input id="product-search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search the zone" />
          {search && <button type="button" className="clear-search" onClick={() => onSearch('')} aria-label="Clear search"><X size={14} /></button>}
        </form>
        <div className="header-actions">
          <button className="icon-button theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>
          <Link className="icon-button account-link" to={currentUser?.role === 'admin' ? '/admin' : currentUser ? '/orders' : '/login'} aria-label={currentUser ? `Account for ${currentUser.name}` : 'Login'}>
            <UserRound size={23} /><span>{currentUser ? currentUser.name.split(' ')[0].toUpperCase() : 'LOGIN'}</span>
          </Link>
          {currentUser && <button className="icon-button account-signout" onClick={onSignOut} aria-label="Sign out" title="Sign out"><LogOut size={15} /><span>LOG OUT</span></button>}
          <Link className="icon-button wishlist-link" to="/products?wishlist=true" aria-label="Wishlist"><Heart size={24} /></Link>
          <Link className="icon-button bag-button" to="/cart" aria-label={`Shopping bag, ${cartCount} items`}><ShoppingBag size={24} /><span>BAG</span><i>{cartCount}</i></Link>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
