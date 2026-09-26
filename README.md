# Walmart Pro

AI-powered inventory redistribution and waste reduction platform.

## Day 1 backend structure

```text
backend/
	models/
		Store.js
		Sku.js
		Inventory.js
		SalesHistory.js
		Transfer.js
		User.js
	scripts/
		generateSyntheticData.js
	routes/
	server.js
	.env
	package.json
```

The Mongoose models cover stores, products, current inventory, historical sales,
transfers, and an auth-ready user context. Users support the `admin` and
`store_manager` roles; transfers retain both the approving user and role.

## Run the backend

From `backend/`, make sure MongoDB is running locally, then run:

```bash
npm run seed
npm run dev
```

The health check is available at `http://localhost:5000/api/health`.

## Day 3 forecasting

The forecasting service reads the existing sales history and uses linear
regression to project the next 7 days for one store/SKU pair. No new collection
is created. Use the API after finding the IDs in MongoDB Compass:

```text
GET http://localhost:5000/api/forecasts/:storeId/:skuId
```

Replace `:storeId` and `:skuId` with the actual `_id` values from the
`stores` and `skus` collections. Do not send the colon placeholders literally.

The response includes the daily forecast, the 7-day `predictedDemand` total,
and the regression slope/intercept for explainability.

The seed script creates 3 stores, 5 SKUs, current inventory, and 90 days of
deterministic synthetic sales history with trend, weekend spikes, and store
imbalances for future forecasting and redistribution work.