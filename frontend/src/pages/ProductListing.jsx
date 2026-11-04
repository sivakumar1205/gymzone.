import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import StoreLayout from '../components/StoreLayout.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { PRODUCT_CATEGORIES } from '../data/products.js';
import './ProductListing.css';

const MAX_PRICE = 50000;

function ProductListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { search, setSearch, addToCart, wishlist, toggleWishlist, products } = useStore();
  const [selectedBrand, setSelectedBrand] = useState('');
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);

  const selectedCategory = searchParams.get('category') || '';
  const sortBy = searchParams.get('sort') || 'featured';
  const showWishlistOnly = searchParams.get('wishlist') === 'true';
  const urlSearch = searchParams.get('search') || '';
  const brands = [...new Set(products.map((product) => product.brand))].sort();

  useEffect(() => {
    if (search !== urlSearch) {
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matchingProducts = products.filter((product) => {
      const matchesSearch = !query || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query);
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesBrand = !selectedBrand || product.brand === selectedBrand;
      const matchesPrice = product.price <= maxPrice;
      const matchesWishlist = !showWishlistOnly || wishlist.includes(product.id);
      return matchesSearch && matchesCategory && matchesBrand && matchesPrice && matchesWishlist;
    });

    if (sortBy === 'price-low') {
      return matchingProducts.sort((first, second) => first.price - second.price);
    }
    if (sortBy === 'price-high') {
      return matchingProducts.sort((first, second) => second.price - first.price);
    }
    if (sortBy === 'newest') {
      return matchingProducts.sort((first, second) => Number(second.isNew) - Number(first.isNew));
    }
    return matchingProducts;
  }, [products, search, selectedCategory, selectedBrand, maxPrice, showWishlistOnly, sortBy, wishlist]);

  function updateParam(key, value) {
    const nextParams = new URLSearchParams(searchParams);
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
    setSearchParams(nextParams);
  }

  function resetFilters() {
    setSelectedBrand('');
    setMaxPrice(MAX_PRICE);
    setSearch('');
    setSearchParams({});
  }

  return (
    <StoreLayout>
      <main className="listing-page content-width">
        <div className="listing-breadcrumb"><Link to="/">HOME</Link><span>/</span><span>SHOP PRODUCTS</span></div>
        <SectionHeading
          eyebrow="FIND YOUR NEXT FAVOURITE"
          title={showWishlistOnly ? 'YOUR WISHLIST' : selectedCategory ? selectedCategory.toUpperCase() : 'SHOP ALL GEAR'}
          description="Training essentials, selected for the work."
        />

        <nav className="listing-categories" aria-label="Filter by product category">
          <button className={!selectedCategory ? 'is-active' : ''} onClick={() => updateParam('category', '')}>ALL GEAR</button>
          {PRODUCT_CATEGORIES.map((category) => (
            <button className={selectedCategory === category ? 'is-active' : ''} key={category} onClick={() => updateParam('category', category)}>{category}</button>
          ))}
        </nav>

        <div className="listing-toolbar">
          <p><strong>{filteredProducts.length}</strong> PRODUCTS</p>
          <div className="listing-controls">
            <label>
              <span>BRAND</span>
              <select value={selectedBrand} onChange={(event) => setSelectedBrand(event.target.value)}>
                <option value="">All brands</option>
                {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </label>
            <label className="price-filter">
              <span>PRICE UP TO <strong>₹{maxPrice.toLocaleString('en-IN')}</strong></span>
              <input aria-label="Maximum price" type="range" min="500" max={MAX_PRICE} step="500" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} />
            </label>
            <label>
              <span>SORT BY</span>
              <select value={sortBy} onChange={(event) => updateParam('sort', event.target.value === 'featured' ? '' : event.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
            </label>
            <button className="reset-filters" onClick={resetFilters}>CLEAR FILTERS</button>
          </div>
        </div>

        {filteredProducts.length ? (
          <div className="product-grid listing-product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={() => addToCart(product.id)}
                onToggleWishlist={toggleWishlist}
                isWishlisted={wishlist.includes(product.id)}
                showStock
              />
            ))}
          </div>
        ) : (
          <div className="listing-empty">
            <h2>NO GEAR FOUND.</h2>
            <p>Try a different search or clear some filters.</p>
            <button className="button button-orange" onClick={resetFilters}>CLEAR FILTERS</button>
          </div>
        )}
      </main>
    </StoreLayout>
  );
}

export default ProductListing;
