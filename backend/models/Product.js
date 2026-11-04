import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  category: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  isNew: { type: Boolean, default: false },
  badge: { type: String, trim: true },
  image: { type: String, required: true },
  imageAlt: { type: String, trim: true },
  imageFit: { type: String, enum: ['contain', 'cover'], default: 'contain' },
  categoryLabel: { type: String, trim: true },
  description: { type: String, trim: true },
  specifications: { type: [[String]], default: [] },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
