/**
 * SmartDeal CRM — Vehicle Recommendation Engine
 * samples/vehicle-recommendation.js
 *
 * AI-powered vehicle recommendation based on customer requirements captured
 * during the Requirement Discovery wizard.
 *
 * Phase 1: Rule-based content scoring (deployed immediately)
 * Phase 2: Collaborative filtering blend (after 500+ purchase records)
 *
 * Recommends top 3 Tata Motors vehicle variants ranked by match percentage.
 */

'use strict';

// ─── Vehicle Catalogue (Sample — in production, loaded from PostgreSQL) ───────

/**
 * Simplified vehicle feature vectors for scoring.
 * In production, this is loaded from vehicle_variants + vehicle_features tables.
 */
const VEHICLE_CATALOGUE = [
  {
    variantId: 'nexon-xz-plus-petrol-mt',
    modelName: 'Tata Nexon',
    variantName: 'XZ+ Petrol MT',
    segment: 'compact_suv',
    fuelType: 'petrol',
    transmission: 'manual',
    seatingCapacity: 5,
    exShowroomPrice: 850000,
    monthlyEmiApprox: 16500,  // At ~9% for 60 months, 80% LTV
    mileageKmpl: 17.0,
    bootSpaceLitres: 350,
    groundClearanceMm: 209,
    hasSunroof: true,
    hasADAS: true,
    ncapRating: 5,
    infotainmentInch: 10.25,
    hasConnectedCar: true,
    hasEV: false,
    evRangeKm: 0,
    features: ['sunroof', 'adas', 'connected_car', 'wireless_charger', 'ventilated_seats'],
    bestFor: ['city', 'mixed'],
    familyFit: [2, 3, 4, 5],
  },
  {
    variantId: 'nexon-ev-max-xz-plus-lux',
    modelName: 'Tata Nexon EV',
    variantName: 'EV Max XZ+ Lux',
    segment: 'compact_suv',
    fuelType: 'electric',
    transmission: 'automatic',
    seatingCapacity: 5,
    exShowroomPrice: 1650000,
    monthlyEmiApprox: 32000,
    mileageKmpl: 0,
    evRangeKm: 453,
    bootSpaceLitres: 350,
    groundClearanceMm: 209,
    hasSunroof: true,
    hasADAS: true,
    ncapRating: 5,
    infotainmentInch: 10.25,
    hasConnectedCar: true,
    hasEV: true,
    features: ['sunroof', 'adas', 'connected_car', 'fast_charging', 'regenerative_braking'],
    bestFor: ['city'],
    familyFit: [2, 3, 4, 5],
    requiresGarage: true,  // For home charging
  },
  {
    variantId: 'punch-icng-adventure-rhythm',
    modelName: 'Tata Punch',
    variantName: 'iCNG Adventure Rhythm',
    segment: 'micro_suv',
    fuelType: 'cng',
    transmission: 'manual',
    seatingCapacity: 5,
    exShowroomPrice: 720000,
    monthlyEmiApprox: 14000,
    mileageKmpl: 26.99,  // CNG km/kg
    bootSpaceLitres: 366,
    groundClearanceMm: 187,
    hasSunroof: false,
    hasADAS: false,
    ncapRating: 5,
    infotainmentInch: 7.0,
    hasConnectedCar: true,
    hasEV: false,
    evRangeKm: 0,
    features: ['connected_car', 'cng_dual_fuel'],
    bestFor: ['city'],
    familyFit: [2, 3, 4, 5],
    economyFocused: true,
  },
  {
    variantId: 'harrier-xz-plus-diesel-at',
    modelName: 'Tata Harrier',
    variantName: 'XZ+ Diesel AT',
    segment: 'suv',
    fuelType: 'diesel',
    transmission: 'automatic',
    seatingCapacity: 5,
    exShowroomPrice: 2000000,
    monthlyEmiApprox: 38000,
    mileageKmpl: 16.35,
    bootSpaceLitres: 425,
    groundClearanceMm: 205,
    hasSunroof: true,
    hasADAS: true,
    ncapRating: 5,
    infotainmentInch: 10.25,
    hasConnectedCar: true,
    hasEV: false,
    evRangeKm: 0,
    features: ['sunroof', 'adas', 'connected_car', 'terrain_modes', 'premium_audio', 'panoramic_sunroof'],
    bestFor: ['mixed', 'highway'],
    familyFit: [2, 3, 4, 5],
  },
  {
    variantId: 'safari-adventure-plus-diesel-mt',
    modelName: 'Tata Safari',
    variantName: 'Adventure Plus Diesel MT',
    segment: 'suv',
    fuelType: 'diesel',
    transmission: 'manual',
    seatingCapacity: 7,
    exShowroomPrice: 1850000,
    monthlyEmiApprox: 36000,
    mileageKmpl: 16.30,
    bootSpaceLitres: 447,
    groundClearanceMm: 205,
    hasSunroof: true,
    hasADAS: true,
    ncapRating: 5,
    infotainmentInch: 10.25,
    hasConnectedCar: true,
    hasEV: false,
    evRangeKm: 0,
    features: ['sunroof', 'adas', '7_seater', 'connected_car', 'terrain_modes'],
    bestFor: ['mixed', 'highway'],
    familyFit: [5, 6, 7],
  },
  {
    variantId: 'tiago-xz-plus-petrol-amt',
    modelName: 'Tata Tiago',
    variantName: 'XZ+ AMT Petrol',
    segment: 'hatchback',
    fuelType: 'petrol',
    transmission: 'amt',
    seatingCapacity: 5,
    exShowroomPrice: 630000,
    monthlyEmiApprox: 12500,
    mileageKmpl: 19.8,
    bootSpaceLitres: 242,
    groundClearanceMm: 170,
    hasSunroof: false,
    hasADAS: false,
    ncapRating: 4,
    infotainmentInch: 7.0,
    hasConnectedCar: false,
    hasEV: false,
    evRangeKm: 0,
    features: ['amt_gearbox', 'connected_car_basic'],
    bestFor: ['city'],
    familyFit: [2, 3, 4],
    economyFocused: true,
  },
  {
    variantId: 'altroz-xz-plus-petrol',
    modelName: 'Tata Altroz',
    variantName: 'XZ+ Petrol',
    segment: 'premium_hatchback',
    fuelType: 'petrol',
    transmission: 'manual',
    seatingCapacity: 5,
    exShowroomPrice: 850000,
    monthlyEmiApprox: 16500,
    mileageKmpl: 19.0,
    bootSpaceLitres: 345,
    groundClearanceMm: 165,
    hasSunroof: false,
    hasADAS: false,
    ncapRating: 5,
    infotainmentInch: 10.25,
    hasConnectedCar: true,
    hasEV: false,
    evRangeKm: 0,
    features: ['premium_interior', 'connected_car', 'wireless_charger'],
    bestFor: ['city'],
    familyFit: [2, 3, 4, 5],
  },
];

// ─── Scoring Engine ───────────────────────────────────────────────────────────

/**
 * Scores a single vehicle variant against customer requirements.
 * Returns a score from 0 to 100.
 *
 * @param {object} vehicle - Vehicle from catalogue
 * @param {object} requirements - Customer requirements from discovery wizard
 * @returns {object} { score, matchReasons, missReasons }
 */
function scoreVehicle(vehicle, requirements) {
  let score = 0;
  const maxScore = 100;
  const matchReasons = [];
  const missReasons = [];

  // ── 1. Budget Fit (25 points) ──────────────────────────────────────────────
  const budgetScore = calculateBudgetScore(vehicle, requirements);
  score += budgetScore.points;
  if (budgetScore.match) matchReasons.push(budgetScore.reason);
  else missReasons.push(budgetScore.reason);

  // ── 2. Fuel Type (20 points) ───────────────────────────────────────────────
  if (requirements.fuelPreference) {
    if (vehicle.fuelType === requirements.fuelPreference) {
      score += 20;
      matchReasons.push(`${capitalize(requirements.fuelPreference)} fuel — exactly what you want`);
    } else if (isAlternativeFuelAcceptable(requirements.fuelPreference, vehicle.fuelType)) {
      score += 10;
      matchReasons.push(`${capitalize(vehicle.fuelType)} — good alternative to your preference`);
    } else {
      missReasons.push(`Fuel type (${vehicle.fuelType}) doesn't match preference (${requirements.fuelPreference})`);
    }
  } else {
    score += 15;  // No preference stated, give partial credit
  }

  // ── 3. Transmission (10 points) ───────────────────────────────────────────
  if (requirements.transmissionPref) {
    if (vehicle.transmission === requirements.transmissionPref) {
      score += 10;
      matchReasons.push(`${capitalize(requirements.transmissionPref)} transmission — as preferred`);
    } else if (requirements.transmissionPref === 'automatic' && vehicle.transmission === 'amt') {
      score += 8;  // AMT is close to automatic
      matchReasons.push('AMT (Auto-gear shift) — similar to automatic');
    } else {
      score += 3;
    }
  } else {
    score += 7;
  }

  // ── 4. Seating Capacity / Family Fit (15 points) ──────────────────────────
  if (requirements.familySize) {
    const minSeats = Math.max(requirements.familySize - 1, 2); // Allow 1 below family size
    if (vehicle.seatingCapacity >= requirements.familySize) {
      score += 15;
      matchReasons.push(`${vehicle.seatingCapacity} seats comfortably fits your family of ${requirements.familySize}`);
    } else if (vehicle.seatingCapacity >= minSeats) {
      score += 8;
    } else {
      missReasons.push(`Only ${vehicle.seatingCapacity} seats may be insufficient for family of ${requirements.familySize}`);
    }
  } else {
    score += 10;
  }

  // ── 5. Usage Type (10 points) ─────────────────────────────────────────────
  if (requirements.usageType) {
    if (vehicle.bestFor.includes(requirements.usageType)) {
      score += 10;
      matchReasons.push(`Ideal for ${requirements.usageType} use`);
    } else if (vehicle.bestFor.includes('mixed')) {
      score += 7;
    } else {
      score += 3;
    }
  } else {
    score += 7;
  }

  // ── 6. Priority Features (10 points) ──────────────────────────────────────
  let featurePoints = 0;
  if (requirements.prioritySafety && vehicle.ncapRating >= 5) {
    featurePoints += 4;
    matchReasons.push(`5-star NCAP safety rating`);
  }
  if (requirements.priorityComfort && vehicle.hasSunroof) {
    featurePoints += 3;
    matchReasons.push('Sunroof for comfort');
  }
  if (requirements.priorityTechnology && vehicle.hasADAS) {
    featurePoints += 3;
    matchReasons.push('ADAS safety technology');
  }
  score += Math.min(featurePoints, 10);

  // ── 7. EV Infrastructure (5 points) ───────────────────────────────────────
  if (vehicle.fuelType === 'electric') {
    if (requirements.hasGarage) {
      score += 5;
      matchReasons.push('You have a garage for home charging — perfect for EV');
    } else {
      score -= 5;
      missReasons.push('EV requires home charging setup — you mentioned no garage');
    }
  }

  // ── 8. Economy Focus (5 points) ───────────────────────────────────────────
  if (requirements.priorityEconomy && vehicle.economyFocused) {
    score += 5;
    matchReasons.push('Economy-focused choice with great fuel efficiency');
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    matchPercentage: score,
    matchReasons,
    missReasons,
  };
}

function calculateBudgetScore(vehicle, requirements) {
  if (!requirements.monthlyEmiBudget && !requirements.downPayment) {
    return { points: 15, match: true, reason: 'Flexible budget' };
  }

  const emi = vehicle.monthlyEmiApprox;
  const budget = requirements.monthlyEmiBudget;

  if (!budget) return { points: 15, match: true, reason: 'No EMI preference stated' };

  const budgetRatio = emi / budget;

  if (budgetRatio <= 0.85) {
    return { points: 25, match: true, reason: `Within budget at ~₹${Math.round(emi/1000)}K EMI` };
  } else if (budgetRatio <= 1.0) {
    return { points: 20, match: true, reason: `Just within budget at ~₹${Math.round(emi/1000)}K EMI` };
  } else if (budgetRatio <= 1.15) {
    return { points: 12, match: false, reason: `Slightly above budget (~₹${Math.round((emi - budget)/1000)}K over)` };
  } else if (budgetRatio <= 1.30) {
    return { points: 5, match: false, reason: `Above budget by ~₹${Math.round((emi - budget)/1000)}K/month` };
  } else {
    return { points: 0, match: false, reason: `Significantly above stated budget` };
  }
}

function isAlternativeFuelAcceptable(preference, vehicleFuel) {
  const alternatives = {
    'petrol': ['cng'],
    'cng': ['petrol'],
    'electric': ['hybrid'],
    'hybrid': ['electric'],
  };
  return (alternatives[preference] || []).includes(vehicleFuel);
}

// ─── Main Recommendation Function ────────────────────────────────────────────

/**
 * Generates top vehicle recommendations for a customer based on their requirements.
 *
 * @param {object} requirements - Customer requirements from discovery wizard
 * @param {Array} catalogue - Vehicle catalogue (defaults to built-in sample)
 * @returns {Array} Top recommendations sorted by match score
 */
function recommendVehicles(requirements, catalogue = VEHICLE_CATALOGUE) {
  if (!requirements) throw new Error('Requirements object is required');

  const scored = catalogue.map(vehicle => {
    const scoring = scoreVehicle(vehicle, requirements);
    return {
      vehicle: {
        variantId: vehicle.variantId,
        modelName: vehicle.modelName,
        variantName: vehicle.variantName,
        segment: vehicle.segment,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        seatingCapacity: vehicle.seatingCapacity,
        exShowroomPrice: vehicle.exShowroomPrice,
        monthlyEmiApprox: vehicle.monthlyEmiApprox,
        mileageKmpl: vehicle.mileageKmpl,
        evRangeKm: vehicle.evRangeKm,
        hasSunroof: vehicle.hasSunroof,
        hasADAS: vehicle.hasADAS,
        ncapRating: vehicle.ncapRating,
        hasConnectedCar: vehicle.hasConnectedCar,
        features: vehicle.features,
      },
      matchScore: scoring.score,
      matchPercentage: scoring.matchPercentage,
      matchLabel: getMatchLabel(scoring.score),
      matchReasons: scoring.matchReasons,
      considerationPoints: scoring.missReasons,
      explanation: generateExplanation(vehicle, requirements, scoring),
    };
  });

  // Sort by score descending, return top 3
  const topRecommendations = scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  return {
    recommendations: topRecommendations,
    customerProfile: summariseCustomerProfile(requirements),
    generatedAt: new Date().toISOString(),
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getMatchLabel(score) {
  if (score >= 85) return 'Excellent Match';
  if (score >= 70) return 'Great Match';
  if (score >= 55) return 'Good Match';
  if (score >= 40) return 'Fair Match';
  return 'Partial Match';
}

function generateExplanation(vehicle, requirements, scoring) {
  const topReasons = scoring.matchReasons.slice(0, 2).join(', ');
  if (scoring.matchReasons.length === 0) {
    return `The ${vehicle.modelName} ${vehicle.variantName} is a capable option worth considering.`;
  }
  return `The ${vehicle.modelName} ${vehicle.variantName} scores highly because: ${topReasons}.`;
}

function summariseCustomerProfile(req) {
  const parts = [];
  if (req.familySize) parts.push(`Family of ${req.familySize}`);
  if (req.usageType) parts.push(`${req.usageType} use`);
  if (req.fuelPreference) parts.push(`prefers ${req.fuelPreference}`);
  if (req.monthlyEmiBudget) parts.push(`EMI budget ₹${Math.round(req.monthlyEmiBudget / 1000)}K/month`);
  return parts.join(', ') || 'General customer';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  recommendVehicles,
  scoreVehicle,
  calculateBudgetScore,
  VEHICLE_CATALOGUE,
};

// ─── Sample Usage ─────────────────────────────────────────────────────────────

if (require.main === module) {
  const customerRequirements = {
    familySize: 4,
    primaryDriverAge: 35,
    usageType: 'city',
    dailyKm: 40,
    monthlyEmiBudget: 18000,
    downPayment: 200000,
    fuelPreference: 'petrol',
    transmissionPref: 'manual',
    prioritySafety: true,
    priorityComfort: false,
    priorityEconomy: false,
    priorityPerformance: false,
    priorityTechnology: true,
    hasGarage: false,
  };

  const result = recommendVehicles(customerRequirements);

  console.log('\n─── SmartDeal Vehicle Recommendations ───');
  console.log(`Customer: ${result.customerProfile}\n`);

  result.recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec.vehicle.modelName} ${rec.vehicle.variantName}`);
    console.log(`   Match: ${rec.matchScore}% (${rec.matchLabel})`);
    console.log(`   Price: ₹${(rec.vehicle.exShowroomPrice / 100000).toFixed(1)}L ex-showroom`);
    console.log(`   EMI:   ~₹${Math.round(rec.vehicle.monthlyEmiApprox / 1000)}K/month`);
    console.log(`   Why:   ${rec.explanation}`);
    if (rec.considerationPoints.length) {
      console.log(`   Note:  ${rec.considerationPoints[0]}`);
    }
    console.log();
  });
}
