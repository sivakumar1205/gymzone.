import Product from '../models/Product.js';

export async function listProducts(request, response) {
  const filter = { active: true };
  if (request.query.category) filter.category = request.query.category;
  const products = await Product.find(filter).sort({ createdAt: 1 });
  response.json({ products });
}

export async function getProduct(request, response) {
  const product = await Product.findOne({ id: request.params.id, active: true });
  if (!product) return response.status(404).json({ message: 'Product not found.' });
  response.json({ product });
}
