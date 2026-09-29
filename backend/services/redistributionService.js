const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Sku = require('../models/Sku');
const Store = require('../models/Store');
const { forecastDemand } = require('./forecastService');
const { getDistanceKm } = require('../utils/distanceTable');

const FORECAST_DAYS = 7;
const SURPLUS_MULTIPLIER = 1.15;
const DEFICIT_MULTIPLIER = 0.7;
const MAX_DISTANCE_KM = 60;

function invalidIdError() {
  const error = new Error('skuId must be a valid MongoDB ObjectId');
  error.statusCode = 400;
  return error;
}

function calculateUrgency(units, sku) {
  if (units <= 0) {
    return 0;
  }

  const shelfLifeDays = sku.shelfLifeDays || (sku.perishable ? 7 : 365);
  const expiryWeight = sku.perishable ? 1 + FORECAST_DAYS / shelfLifeDays : 1;
  return Number((units * expiryWeight).toFixed(2));
}

async function findRedistributionOpportunities(skuId) {
  if (!mongoose.isValidObjectId(skuId)) {
    throw invalidIdError();
  }

  const [sku, stores, inventory] = await Promise.all([
    Sku.findById(skuId).lean(),
    Store.find().sort({ code: 1 }).lean(),
    Inventory.find({ skuId }).lean(),
  ]);

  if (!sku) {
    const error = new Error('SKU not found');
    error.statusCode = 404;
    throw error;
  }

  const inventoryByStore = new Map(inventory.map((record) => [String(record.storeId), record]));
  const assessments = await Promise.all(
    stores.map(async (store) => {
      const storeId = String(store._id);
      const stockQty = inventoryByStore.get(storeId)?.stockQty || 0;
      const forecast = await forecastDemand(storeId, skuId);
      const balance = stockQty - forecast.predictedDemand;
      const status = stockQty > forecast.predictedDemand * SURPLUS_MULTIPLIER
        ? 'surplus'
        : stockQty < forecast.predictedDemand * DEFICIT_MULTIPLIER
          ? 'deficit'
          : 'balanced';
      const surplusQty = status === 'surplus' ? balance : 0;
      const deficitQty = status === 'deficit' ? Math.abs(balance) : 0;

      return {
        storeId,
        storeName: store.name,
        storeCode: store.code,
        stockQty,
        forecastedDemand: forecast.predictedDemand,
        dailyForecast: forecast.dailyForecast,
        balance,
        status,
        surplusQty,
        deficitQty,
        urgencyScore: calculateUrgency(surplusQty || deficitQty, sku),
      };
    })
  );

  const sources = assessments
    .filter((assessment) => assessment.status === 'surplus')
    .sort((left, right) => right.urgencyScore - left.urgencyScore);
  const destinations = assessments
    .filter((assessment) => assessment.status === 'deficit')
    .sort((left, right) => right.urgencyScore - left.urgencyScore);
  const remainingSurplus = new Map(sources.map((source) => [source.storeId, source.surplusQty]));
  const remainingDeficit = new Map(destinations.map((destination) => [destination.storeId, destination.deficitQty]));
  const opportunities = [];

  for (const source of sources) {
    for (const destination of destinations) {
      if (source.storeId === destination.storeId) {
        continue;
      }

      const distanceKm = getDistanceKm(source.storeCode, destination.storeCode);
      const transferableQty = Math.min(
        remainingSurplus.get(source.storeId),
        remainingDeficit.get(destination.storeId)
      );

      if (distanceKm === null || distanceKm > MAX_DISTANCE_KM || transferableQty <= 0) {
        continue;
      }

      const quantity = Math.floor(transferableQty);
      if (quantity <= 0) {
        continue;
      }

      const priorityScore = Number((source.urgencyScore + destination.urgencyScore).toFixed(2));
      opportunities.push({
        skuId: String(sku._id),
        skuName: sku.name,
        perishable: sku.perishable,
        shelfLifeDays: sku.shelfLifeDays || (sku.perishable ? 7 : 365),
        fromStore: { id: source.storeId, name: source.storeName, code: source.storeCode },
        toStore: { id: destination.storeId, name: destination.storeName, code: destination.storeCode },
        quantity,
        distanceKm,
        priorityScore,
        reason: sku.perishable
          ? 'Perishable surplus should be moved before expiry risk increases.'
          : 'Transfer reduces forecasted stock imbalance between stores.',
      });
      remainingSurplus.set(source.storeId, remainingSurplus.get(source.storeId) - quantity);
      remainingDeficit.set(destination.storeId, remainingDeficit.get(destination.storeId) - quantity);
    }
  }

  return {
    sku: {
      id: String(sku._id),
      name: sku.name,
      category: sku.category,
      perishable: sku.perishable,
      shelfLifeDays: sku.shelfLifeDays || (sku.perishable ? 7 : 365),
    },
    rules: {
      forecastDays: FORECAST_DAYS,
      surplusRule: `stock > forecast x ${SURPLUS_MULTIPLIER}`,
      deficitRule: `stock < forecast x ${DEFICIT_MULTIPLIER}`,
      maxDistanceKm: MAX_DISTANCE_KM,
      expiryWeight: 'surplus or deficit units x (1 + 7 / shelfLifeDays) for perishables',
    },
    assessments,
    opportunities: opportunities.sort((left, right) => right.priorityScore - left.priorityScore),
  };
}

async function findAllRedistributionOpportunities() {
  const skus = await Sku.find().select({ _id: 1 }).lean();
  const results = await Promise.all(
    skus.map((sku) => findRedistributionOpportunities(String(sku._id)))
  );

  return {
    skuCount: results.length,
    results,
    opportunities: results.flatMap((result) => result.opportunities),
  };
}

module.exports = { findAllRedistributionOpportunities, findRedistributionOpportunities };
