require('dotenv').config();

const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const SalesHistory = require('../models/SalesHistory');
const Sku = require('../models/Sku');
const Store = require('../models/Store');
const User = require('../models/User');

const storeSeed = [
  { name: 'Store A', code: 'STORE-A', location: { lat: 40.7128, lng: -74.006 } },
  { name: 'Store B', code: 'STORE-B', location: { lat: 40.7306, lng: -73.9866 } },
  { name: 'Store C', code: 'STORE-C', location: { lat: 40.6782, lng: -73.9442 } },
];

const skuSeed = [
  { name: 'Whole Milk', category: 'Dairy', perishable: true },
  { name: 'Bananas', category: 'Produce', perishable: true },
  { name: 'Bread', category: 'Bakery', perishable: true },
  { name: 'Canned Beans', category: 'Pantry', perishable: false },
  { name: 'Laundry Detergent', category: 'Household', perishable: false },
];

function salesForDay(skuIndex, dayIndex, storeIndex) {
  const baseDemand = 12 + skuIndex * 4 + storeIndex * 2;
  const trend = dayIndex * 0.04;
  const weekendSpike = dayIndex % 7 >= 5 ? 5 : 0;
  const noise = ((dayIndex * 17 + skuIndex * 11 + storeIndex * 7) % 7) - 3;

  return Math.max(0, Math.round(baseDemand + trend + weekendSpike + noise));
}

async function generateSyntheticData() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([
    Inventory.deleteMany({}),
    SalesHistory.deleteMany({}),
    User.deleteMany({}),
    Sku.deleteMany({}),
    Store.deleteMany({}),
  ]);

  const stores = await Store.insertMany(storeSeed);
  const skus = await Sku.insertMany(skuSeed);

  await User.insertMany([
    { name: 'Demo Admin', role: 'admin' },
    { name: 'Store A Manager', role: 'store_manager', storeId: stores[0]._id },
    { name: 'Store B Manager', role: 'store_manager', storeId: stores[1]._id },
    { name: 'Store C Manager', role: 'store_manager', storeId: stores[2]._id },
  ]);

  const inventory = [];
  const salesHistory = [];
  const today = new Date();

  for (let storeIndex = 0; storeIndex < stores.length; storeIndex += 1) {
    for (let skuIndex = 0; skuIndex < skus.length; skuIndex += 1) {
      const imbalance = (storeIndex - skuIndex) * 18;
      inventory.push({
        storeId: stores[storeIndex]._id,
        skuId: skus[skuIndex]._id,
        stockQty: Math.max(10, 90 + imbalance),
        recordedAt: today,
      });

      for (let dayIndex = 0; dayIndex < 90; dayIndex += 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - (89 - dayIndex));
        date.setHours(0, 0, 0, 0);
        salesHistory.push({
          storeId: stores[storeIndex]._id,
          skuId: skus[skuIndex]._id,
          date,
          unitsSold: salesForDay(skuIndex, dayIndex, storeIndex),
        });
      }
    }
  }

  await Inventory.insertMany(inventory);
  await SalesHistory.insertMany(salesHistory);
  console.log(`Seeded ${stores.length} stores, ${skus.length} SKUs, ${salesHistory.length} sales records.`);
}

generateSyntheticData()
  .catch((error) => {
    console.error('Unable to generate synthetic data:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
