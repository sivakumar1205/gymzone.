import { ArrowUpRight, Heart, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import './ProductCard.css';
import ProductImage from './ProductImage.jsx';

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function ProductCard({ product, onAdd, onToggleWishlist, isWishlisted = false, showStock = false }) {
  const productId = product.id || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  return (
    <article className="product-card">
      <div className="product-media">
        <Link className="product-image" to={`/products/${productId}`} aria-label={`View ${product.name}`}>
          <ProductImage product={product} />
          {product.badge && <span className="product-badge">{product.badge}</span>}
          {discount > 0 && <span className="product-discount">-{discount}%</span>}
          <span className="product-view"><ArrowUpRight size={17} /></span>
        </Link>
        {onToggleWishlist && (
          <button
            className={`product-wishlist ${isWishlisted ? 'is-wishlisted' : ''}`}
            onClick={() => onToggleWishlist(productId)}
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            aria-pressed={isWishlisted}
          >
            <Heart size={17} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
      <div className="product-details">
        <p className="product-brand">{product.brand}</p>
        <div className="product-title-row">
          <h3><Link to={`/products/${productId}`}>{product.name}</Link></h3>
          <button
            className="add-button"
            onClick={() => onAdd?.(product)}
            disabled={Number.isInteger(product.stock) && product.stock === 0}
            aria-label={`Add ${product.name} to bag`}
          >
            <Plus size={19} />
          </button>
        </div>
        <p className="product-category">{product.categoryLabel || product.category}</p>
        <div className="product-meta">
          <span className="product-prices">
            <strong>{fmt(product.price)}</strong>
            {product.oldPrice && <del>{fmt(product.oldPrice)}</del>}
          </span>
        </div>
        {showStock && (
          <p className={`product-stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
            {product.stock > 0 ? `${product.stock < 6 ? 'Only ' : ''}${product.stock} in stock` : 'Out of stock'}
          </p>
        )}
      </div>
    </article>
  );
}

export default ProductCard;
