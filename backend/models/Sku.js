const mongoose = require('mongoose');

const skuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    perishable: { type: Boolean, default: false },
    shelfLifeDays: { type: Number, required: true, min: 1, default: 365 },
    unit: { type: String, default: 'unit', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sku', skuSchema);
