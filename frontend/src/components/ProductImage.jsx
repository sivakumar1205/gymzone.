import { useState } from 'react';
import './ProductImage.css';

function ProductImage({ product, className = '', loading = 'lazy' }) {
  const [failedImage, setFailedImage] = useState(null);
  const imageFailed = failedImage === product.image;
  const imageClassName = [
    className,
    product.imageFit === 'cover' ? 'product-image-cover' : '',
  ].filter(Boolean).join(' ');

  if (!product.image || imageFailed) {
    return (
      <div className={`product-image-error ${className}`} role="img" aria-label={`${product.name} image unavailable`}>
        <span>{product.name}</span>
        <small>IMAGE UNAVAILABLE</small>
      </div>
    );
  }

  return (
    <img
      className={imageClassName}
      src={product.image}
      alt={product.imageAlt || product.name}
      loading={loading}
      decoding="async"
      onError={() => setFailedImage(product.image)}
    />
  );
}

export default ProductImage;
