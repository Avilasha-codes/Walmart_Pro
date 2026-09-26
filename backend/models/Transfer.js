const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema(
  {
    skuId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sku', required: true },
    fromStore: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    toStore: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    qty: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['suggested', 'approved', 'rejected', 'in_transit', 'completed'],
      default: 'suggested',
    },
    approvedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, enum: ['admin', 'store_manager'] },
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transfer', transferSchema);
