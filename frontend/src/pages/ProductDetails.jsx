import { useEffect, useState } from 'react';
import { ArrowLeft, Heart, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import StoreLayout from '../components/StoreLayout.jsx';
import { useStore } from '../context/StoreContext.jsx';
import ProductImage from '../components/ProductImage.jsx';
import './ProductDetails.css';

function ProductDetails() {
  const { productId } = useParams();
  const { addToCart, toggleWishlist, wishlist, products } = useStore();
  const navigate = useNavigate();
  const product = products.find((item) => item.id === productId);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState('');
  const isWishlisted = product ? wishlist.includes(product.id) : false;
  const discount = product?.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const relatedProducts = product
    ? products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4)
    : [];

  useEffect(() => {
    setQuantity(1);
    setFeedback('');
  }, [productId]);

  if (!product) {
    return (
      <StoreLayout>
        <main className="product-not-found content-width">
          <p className="section-eyebrow">NOT IN THIS LINE-UP</p>
          <h1>PRODUCT NOT FOUND.</h1>
          <Link className="button button-orange" to="/products">BACK TO SHOP</Link>
        </main>
      </StoreLayout>
    );
  }

  const inStock = product.stock > 0;
  const canAdd = inStock && quantity <= product.stock;

  function addProductToBag() {
    if (!canAdd) return;
    addToCart(product.id, quantity);
    setFeedback(`${quantity} × ${product.name} added to your bag.`);
  }

  function buyNow() {
    if (!canAdd) return;
    addToCart(product.id, quantity);
    navigate('/checkout');
  }

  return (
    <StoreLayout>
      <main className="product-detail-page content-width">
        <div className="detail-breadcrumb"><Link to="/">HOME</Link><span>/</span><Link to="/products">SHOP</Link><span>/</span><span>{product.name.toUpperCase()}</span></div>
        <div className="product-detail-layout">
          <section className="product-gallery" aria-label={`${product.name} product image`}>
            <div className="product-main-image">
              <ProductImage product={product} loading="eager" />
              {discount > 0 && <span className="detail-discount">SAVE {discount}%</span>}
            </div>
          </section>

          <section className="product-purchase">
            <Link className="back-to-list" to="/products"><ArrowLeft size={15} /> BACK TO SHOP</Link>
            <p className="section-eyebrow">{product.brand.toUpperCase()} / {product.category.toUpperCase()}</p>
            <h1>{product.name}</h1>
            <div className="detail-price"><strong>{'₹' + product.price.toLocaleString('en-IN')}</strong>{product.oldPrice && <><del>{'₹' + product.oldPrice.toLocaleString('en-IN')}</del><span>YOU SAVE {discount}%</span></>}</div>
            <p className={`detail-stock ${inStock ? 'in-stock' : 'out-of-stock'}`}>{inStock ? `IN STOCK${product.stock < 6 ? ` · ONLY ${product.stock} LEFT` : ''}` : 'CURRENTLY OUT OF STOCK'}</p>
            <p className="detail-description">{product.description}</p>

            <div className="quantity-row">
              <span>QUANTITY</span>
              <div className="quantity-control">
                <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity" disabled={quantity <= 1}><Minus size={15} /></button>
                <output aria-live="polite">{quantity}</output>
                <button onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))} aria-label="Increase quantity" disabled={!inStock || quantity >= product.stock}><Plus size={15} /></button>
              </div>
            </div>

            <div className="detail-actions">
              <button className="button button-orange" onClick={addProductToBag} disabled={!canAdd}><ShoppingBag size={17} /> ADD TO CART</button>
              <button className="button button-buy" onClick={buyNow} disabled={!canAdd}>BUY NOW <ArrowLeft size={15} /></button>
              <button className={`detail-wishlist ${isWishlisted ? 'is-wishlisted' : ''}`} onClick={() => toggleWishlist(product.id)} aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={isWishlisted}><Heart size={19} fill={isWishlisted ? 'currentColor' : 'none'} /></button>
            </div>
            <p className="detail-feedback" role="status">{feedback}</p>

            <div className="specifications">
              <h2>PRODUCT DETAILS</h2>
              <p>{product.description}</p>
              <dl>{product.specifications.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
            </div>
          </section>
        </div>

        <section className="related-products" id="related-products">
          <SectionHeading eyebrow="KEEP BUILDING YOUR SETUP" title="YOU MAY ALSO LIKE" description="More kit from the same training zone." />
          <div className="product-grid">
            {(relatedProducts.length ? relatedProducts : products.filter((item) => item.id !== product.id).slice(0, 4)).map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                onAdd={() => addToCart(item.id)}
                onToggleWishlist={toggleWishlist}
                isWishlisted={wishlist.includes(item.id)}
                showStock
              />
            ))}
          </div>
        </section>
      </main>
    </StoreLayout>
  );
}

export default ProductDetails;
