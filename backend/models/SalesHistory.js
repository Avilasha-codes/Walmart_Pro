const mongoose = require('mongoose');

const salesHistorySchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    skuId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sku', required: true },
    date: { type: Date, required: true },
    unitsSold: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

salesHistorySchema.index({ storeId: 1, skuId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('SalesHistory', salesHistorySchema);
