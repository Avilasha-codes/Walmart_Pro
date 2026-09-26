const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    skuId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sku', required: true },
    stockQty: { type: Number, required: true, min: 0 },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

inventorySchema.index({ storeId: 1, skuId: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
