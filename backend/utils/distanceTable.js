const distanceTable = {
  STORE_A_STORE_B: 32,
  STORE_A_STORE_C: 58,
  STORE_B_STORE_C: 28,
};

function normalizeStoreCode(code) {
  return code.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function getDistanceKm(fromCode, toCode) {
  const from = normalizeStoreCode(fromCode);
  const to = normalizeStoreCode(toCode);
  const directKey = `${from}_${to}`;
  const reverseKey = `${to}_${from}`;

  if (from === to) {
    return 0;
  }

  const distance = distanceTable[directKey] ?? distanceTable[reverseKey];
  return distance ?? null;
}

module.exports = { distanceTable, getDistanceKm };
