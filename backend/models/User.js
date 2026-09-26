const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'store_manager'], required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
