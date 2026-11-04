import mongoose from 'mongoose';
import products from '../../frontend/src/data/products.js';
import Product from '../models/Product.js';

export default async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required. Add it to backend/.env.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  await Product.bulkWrite(products.map((product) => ({
    updateOne: {
      filter: { id: product.id },
      update: { $setOnInsert: product },
      upsert: true,
    },
  })));

  const legacySupplementBrands = {
    'whey-isolate-vanilla': 'Forge',
    'daily-creatine-monohydrate': 'Apex Athletics',
    'pre-workout-citrus-charge': 'Forge',
    'stride-hydration-electrolyte-blend': 'Stride',
  };
  const supplementFields = ['name', 'brand', 'image', 'imageAlt', 'categoryLabel', 'description', 'specifications'];
  await Product.bulkWrite(products
    .filter((product) => Object.prototype.hasOwnProperty.call(legacySupplementBrands, product.id))
    .map((product) => ({
      updateOne: {
        filter: { id: product.id, brand: legacySupplementBrands[product.id] },
        update: {
          $set: Object.fromEntries(supplementFields.map((field) => [field, product[field]])),
        },
      },
    })));
  console.log('MongoDB connected; sample catalog entries are available.');
}
