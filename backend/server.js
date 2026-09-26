require('dotenv').config();

const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');
const SalesHistory = require('./models/SalesHistory');
const Sku = require('./models/Sku');
const Store = require('./models/Store');
const Transfer = require('./models/Transfer');
const User = require('./models/User');
const { forecastDemand } = require('./services/forecastService');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    service: 'walmart-inventory-backend',
    status: 'running',
    health: '/api/health',
    dataSummary: '/api/data-summary',
    forecast: '/api/forecasts/:storeId/:skuId',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'walmart-inventory-backend' });
});

app.get('/api/data-summary', async (req, res) => {
  try {
    const [stores, skus, inventory, salesHistory, transfers, users] = await Promise.all([
      Store.countDocuments(),
      Sku.countDocuments(),
      Inventory.countDocuments(),
      SalesHistory.countDocuments(),
      Transfer.countDocuments(),
      User.countDocuments(),
    ]);

    res.json({ stores, skus, inventory, salesHistory, transfers, users });
  } catch (error) {
    res.status(500).json({ error: 'Unable to read database summary', details: error.message });
  }
});

app.get('/api/forecasts/:storeId/:skuId', async (req, res) => {
  try {
    const forecast = await forecastDemand(req.params.storeId, req.params.skuId);
    res.json(forecast);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
});

async function startServer() {
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Unable to start backend:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
