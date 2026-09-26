const { linearRegression, linearRegressionLine } = require('simple-statistics');
const mongoose = require('mongoose');
const SalesHistory = require('../models/SalesHistory');

async function forecastDemand(storeId, skuId) {
  if (!mongoose.isValidObjectId(storeId) || !mongoose.isValidObjectId(skuId)) {
    const error = new Error('storeId and skuId must be valid MongoDB ObjectIds. Replace :storeId and :skuId with real IDs.');
    error.statusCode = 400;
    throw error;
  }

  const salesHistory = await SalesHistory.find({ storeId, skuId })
    .sort({ date: 1 })
    .select({ date: 1, unitsSold: 1, _id: 0 })
    .lean();

  if (salesHistory.length === 0) {
    const error = new Error('No sales history found for this store and SKU');
    error.statusCode = 404;
    throw error;
  }

  const dataPoints = salesHistory.map((record, index) => [index, record.unitsSold]);
  const regression = linearRegression(dataPoints);
  const regressionLine = linearRegressionLine(regression);
  const forecastDays = 7;
  const dailyForecast = Array.from({ length: forecastDays }, (_, dayIndex) => {
    const predictedUnits = regressionLine(dataPoints.length + dayIndex);
    return Math.max(0, Math.round(predictedUnits));
  });

  return {
    storeId,
    skuId,
    historyDays: salesHistory.length,
    forecastDays,
    dailyForecast,
    predictedDemand: dailyForecast.reduce((total, units) => total + units, 0),
    regression: {
      slope: regression.m,
      intercept: regression.b,
    },
  };
}

module.exports = { forecastDemand };
