/**
 * SmartDeal CRM — Quotation Engine
 * samples/quotation-engine.js
 *
 * Quotation calculation logic for Tata Motors dealership.
 * Handles: ex-showroom pricing, RTO (state-wise), insurance, accessories,
 *          Extended Warranty, handling charges, GST (CGST/SGST/IGST), TCS.
 *
 * Indian Specific:
 *   - GST: 28% on vehicles (CGST 14% + SGST 14% for intra-state;
 *           IGST 28% for inter-state)
 *   - Compensation Cess: As applicable by GST council (0% for most PVs currently)
 *   - TCS: 1% under Section 206C(1F) for vehicles above ₹10,00,000
 *   - RTO: State-specific road tax rates (loaded from database)
 *   - All amounts in INR (Indian Rupees)
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const GST_RATE_VEHICLES = 28.0;         // 28% GST for motor vehicles
const GST_RATE_ACCESSORIES = 28.0;      // 28% GST for most vehicle accessories
const GST_RATE_EW = 18.0;              // 18% GST for extended warranty (service)
const GST_RATE_HANDLING = 18.0;        // 18% GST for handling charges (service)
const TCS_RATE = 1.0;                  // 1% TCS under Section 206C(1F)
const TCS_THRESHOLD = 1000000;         // ₹10,00,000 — above this, TCS applies
const REGISTRATION_FEE = 600;          // Base RTO registration fee (all states)
const HIGH_SECURITY_PLATE_CHARGES = 500; // HSRP charges

/**
 * State-wise road tax rates (FY 2024-25)
 * For a complete list, this would be loaded from the rto_charges database table.
 * Sample rates included here for demonstration.
 *
 * Format: { minPrice, maxPrice (null=unlimited), taxPercent }
 */
const RTO_TAX_RATES = {
  'maharashtra': [
    { min: 0,        max: 600000,   rate: 7 },
    { min: 600001,   max: 1000000,  rate: 9 },
    { min: 1000001,  max: null,     rate: 11 },
  ],
  'karnataka': [
    { min: 0,        max: null,     rate: 13 },
  ],
  'tamil_nadu': [
    { min: 0,        max: 1000000,  rate: 10 },
    { min: 1000001,  max: null,     rate: 15 },
  ],
  'delhi': [
    { min: 0,        max: 600000,   rate: 4 },
    { min: 600001,   max: null,     rate: 10 },
  ],
  'gujarat': [
    { min: 0,        max: null,     rate: 6 },
  ],
  'telangana': [
    { min: 0,        max: null,     rate: 9 },
  ],
  'rajasthan': [
    { min: 0,        max: null,     rate: 6 },
  ],
  // Default for states not explicitly listed
  '_default': [
    { min: 0,        max: null,     rate: 8 },
  ],
};

// EV-specific exemptions (many states exempt EVs from road tax)
const EV_RTO_EXEMPT_STATES = ['delhi', 'gujarat', 'maharashtra', 'karnataka'];

// ─── GST Calculation ──────────────────────────────────────────────────────────

/**
 * Calculates GST split based on buyer state vs dealership state.
 * Intra-state: CGST + SGST (equal split)
 * Inter-state: IGST (full rate)
 *
 * @param {number} baseAmount - Amount before GST
 * @param {number} gstRate - GST rate (e.g., 28)
 * @param {string} dealershipState - Dealership registration state
 * @param {string} buyerState - Buyer's registration/billing state
 * @returns {object} GST breakdown
 */
function calculateGST(baseAmount, gstRate, dealershipState, buyerState) {
  const isIntraState = normaliseStateName(dealershipState) === normaliseStateName(buyerState);
  const totalGst = roundToTwoDecimals(baseAmount * gstRate / 100);

  if (isIntraState) {
    const halfGst = roundToTwoDecimals(totalGst / 2);
    return {
      isIntraState: true,
      cgstRate: gstRate / 2,
      sgstRate: gstRate / 2,
      igstRate: 0,
      cgstAmount: halfGst,
      sgstAmount: totalGst - halfGst,  // Handle rounding difference
      igstAmount: 0,
      totalGst,
    };
  } else {
    return {
      isIntraState: false,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: gstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: totalGst,
      totalGst,
    };
  }
}

// ─── RTO Charge Calculation ───────────────────────────────────────────────────

/**
 * Calculates RTO road tax for the given state and vehicle price.
 * In production, this reads from the rto_charges PostgreSQL table.
 *
 * @param {number} exShowroomPrice - Vehicle ex-showroom price
 * @param {string} state - Registration state
 * @param {string} fuelType - 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid'
 * @returns {object} RTO charges breakdown
 */
function calculateRTOCharges(exShowroomPrice, state, fuelType = 'petrol') {
  const stateKey = normaliseStateName(state);

  // EV road tax exemption in eligible states
  if (fuelType === 'electric' && EV_RTO_EXEMPT_STATES.includes(stateKey)) {
    return {
      roadTaxRate: 0,
      roadTaxAmount: 0,
      registrationFee: REGISTRATION_FEE,
      hsrpCharges: HIGH_SECURITY_PLATE_CHARGES,
      greenTax: 0,
      totalRtoCharges: REGISTRATION_FEE + HIGH_SECURITY_PLATE_CHARGES,
      isEvExempt: true,
    };
  }

  const rates = RTO_TAX_RATES[stateKey] || RTO_TAX_RATES['_default'];

  // Find the applicable rate slab
  const applicableSlab = rates.find(slab =>
    exShowroomPrice >= slab.min &&
    (slab.max === null || exShowroomPrice <= slab.max)
  );

  const taxRate = applicableSlab ? applicableSlab.rate : 8;  // Default 8%
  const roadTaxAmount = roundToTwoDecimals(exShowroomPrice * taxRate / 100);

  // Green tax (applicable on older vehicles; not applicable on new vehicles)
  const greenTax = 0;

  const totalRtoCharges = roadTaxAmount + REGISTRATION_FEE + HIGH_SECURITY_PLATE_CHARGES + greenTax;

  return {
    roadTaxRate: taxRate,
    roadTaxAmount,
    registrationFee: REGISTRATION_FEE,
    hsrpCharges: HIGH_SECURITY_PLATE_CHARGES,
    greenTax,
    totalRtoCharges: roundToTwoDecimals(totalRtoCharges),
    isEvExempt: false,
  };
}

// ─── TCS Calculation ──────────────────────────────────────────────────────────

/**
 * Calculates TCS (Tax Collected at Source) under Section 206C(1F).
 * Applicable at 1% on the total invoice value for vehicles above ₹10 Lakh ex-showroom.
 *
 * Note: TCS is collected by the SELLER (dealer) from the BUYER and deposited with IT department.
 * The buyer can claim TCS as advance tax credit.
 *
 * @param {number} exShowroomPrice
 * @param {number} totalInvoiceValue - On-road price (before TCS)
 * @returns {object} TCS details
 */
function calculateTCS(exShowroomPrice, totalInvoiceValue) {
  if (exShowroomPrice <= TCS_THRESHOLD) {
    return { tcsApplicable: false, tcsRate: 0, tcsAmount: 0 };
  }

  const tcsAmount = roundToTwoDecimals(exShowroomPrice * TCS_RATE / 100);

  return {
    tcsApplicable: true,
    tcsRate: TCS_RATE,
    tcsAmount,
    tcsSection: '206C(1F)',
    tcsNote: 'TCS on sale of motor vehicle. Buyer can claim as advance tax credit.',
  };
}

// ─── Accessories GST ──────────────────────────────────────────────────────────

/**
 * Calculates accessories total with GST.
 *
 * @param {Array} accessories - [{ name, price, quantity, gstRate }]
 * @returns {object} Accessories totals
 */
function calculateAccessories(accessories = []) {
  let subTotal = 0;
  let totalGst = 0;

  const lineItems = accessories.map(item => {
    const quantity = item.quantity || 1;
    const unitPrice = item.price || 0;
    const lineTotal = roundToTwoDecimals(unitPrice * quantity);
    const gstRate = item.gstRate || GST_RATE_ACCESSORIES;
    const lineGst = roundToTwoDecimals(lineTotal * gstRate / 100);

    subTotal += lineTotal;
    totalGst += lineGst;

    return {
      name: item.name,
      partNumber: item.partNumber,
      quantity,
      unitPrice,
      lineTotal,
      gstRate,
      gstAmount: lineGst,
      totalWithGst: lineTotal + lineGst,
    };
  });

  return {
    lineItems,
    subTotal: roundToTwoDecimals(subTotal),
    totalGst: roundToTwoDecimals(totalGst),
    grandTotal: roundToTwoDecimals(subTotal + totalGst),
  };
}

// ─── EMI Calculation ──────────────────────────────────────────────────────────

/**
 * Calculates monthly EMI using reducing balance method.
 * Formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 *
 * @param {number} principal - Loan amount (₹)
 * @param {number} annualRatePercent - Annual interest rate (e.g., 8.9)
 * @param {number} tenureMonths - Loan tenure in months
 * @returns {object} EMI details
 */
function calculateEMI(principal, annualRatePercent, tenureMonths) {
  if (annualRatePercent === 0) {
    return {
      emiAmount: roundToTwoDecimals(principal / tenureMonths),
      totalPayable: principal,
      totalInterest: 0,
      effectiveRate: 0,
    };
  }

  const monthlyRate = annualRatePercent / 100 / 12;
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  const totalPayable = roundToTwoDecimals(emi * tenureMonths);
  const totalInterest = roundToTwoDecimals(totalPayable - principal);

  return {
    loanAmount: principal,
    tenureMonths,
    annualRatePercent,
    monthlyRate: roundToTwoDecimals(monthlyRate * 100),
    emiAmount: roundToTwoDecimals(emi),
    totalPayable,
    totalInterest,
  };
}

// ─── Main Quotation Calculator ────────────────────────────────────────────────

/**
 * Calculates a complete itemised quotation for a Tata Motors vehicle.
 *
 * @param {object} params
 * @param {number} params.exShowroomPrice - Vehicle ex-showroom price (INR)
 * @param {string} params.fuelType - 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid'
 * @param {string} params.dealershipState - Dealership's state (for GST determination)
 * @param {string} params.rtoState - State where vehicle will be registered
 * @param {object[]} params.accessories - Accessories list
 * @param {number} params.insuranceAmount - Insurance premium (INR)
 * @param {number} params.extendedWarrantyAmount - EW amount (INR), GST @ 18%
 * @param {number} params.handlingCharges - Handling/logistics charges (INR)
 * @param {number} params.manufacturerDiscount - Manufacturer offer/discount (INR)
 * @param {number} params.dealerDiscount - Dealer-offered discount (INR)
 * @param {number} params.exchangeBonus - Exchange bonus amount (INR)
 * @param {number} params.loyaltyBonus - Loyalty bonus (INR)
 * @param {object} params.finance - Optional finance details
 *
 * @returns {object} Complete quotation breakdown
 */
function calculateQuotation(params) {
  const {
    exShowroomPrice,
    fuelType = 'petrol',
    dealershipState = 'Maharashtra',
    rtoState,
    accessories = [],
    insuranceAmount = 0,
    extendedWarrantyAmount = 0,
    handlingCharges = 5000,
    manufacturerDiscount = 0,
    dealerDiscount = 0,
    exchangeBonus = 0,
    loyaltyBonus = 0,
    colourSurcharge = 0,
    finance = null,
  } = params;

  if (!exShowroomPrice || exShowroomPrice <= 0) {
    throw new Error('Ex-showroom price must be a positive number');
  }
  if (!rtoState) {
    throw new Error('RTO state is required for quotation calculation');
  }

  // 1. Vehicle base price (including colour surcharge)
  const vehicleBasePrice = exShowroomPrice + colourSurcharge;

  // 2. GST on vehicle (28% = CGST 14% + SGST 14% or IGST 28%)
  const gst = calculateGST(vehicleBasePrice, GST_RATE_VEHICLES, dealershipState, rtoState);

  // 3. RTO charges (state-specific road tax + registration fee)
  const rto = calculateRTOCharges(exShowroomPrice, rtoState, fuelType);

  // 4. Accessories with GST
  const accessoriesCalc = calculateAccessories(accessories);

  // 5. Extended Warranty GST (18% as it's a service)
  const ewGst = roundToTwoDecimals(extendedWarrantyAmount * GST_RATE_EW / 100);
  const ewTotalWithGst = extendedWarrantyAmount + ewGst;

  // 6. Handling charges GST (18%)
  const handlingGst = roundToTwoDecimals(handlingCharges * GST_RATE_HANDLING / 100);
  const handlingTotalWithGst = handlingCharges + handlingGst;

  // 7. Total before discounts and TCS
  const subtotalBeforeDiscounts = roundToTwoDecimals(
    vehicleBasePrice +
    gst.totalGst +
    rto.totalRtoCharges +
    insuranceAmount +
    accessoriesCalc.grandTotal +
    ewTotalWithGst +
    handlingTotalWithGst
  );

  // 8. Total discounts
  const totalDiscounts = roundToTwoDecimals(
    manufacturerDiscount + dealerDiscount + exchangeBonus + loyaltyBonus
  );

  // 9. Price before TCS
  const priceBeforeTcs = roundToTwoDecimals(subtotalBeforeDiscounts - totalDiscounts);

  // 10. TCS (calculated on ex-showroom price, applicable if > ₹10L)
  const tcsCalc = calculateTCS(exShowroomPrice, priceBeforeTcs);

  // 11. Final on-road price
  const onRoadPrice = roundToTwoDecimals(priceBeforeTcs + tcsCalc.tcsAmount);

  // 12. EMI calculation (if finance requested)
  let emiBreakup = null;
  if (finance && finance.loanAmount && finance.tenureMonths && finance.interestRate) {
    emiBreakup = calculateEMI(finance.loanAmount, finance.interestRate, finance.tenureMonths);
  }

  // ─── Build response ─────────────────────────────────────────────────────────

  return {
    vehicle: {
      exShowroomPrice,
      colourSurcharge,
      vehicleBasePrice,
    },
    gst: {
      ...gst,
      gstAppliedOn: vehicleBasePrice,
    },
    rto: {
      state: rtoState,
      ...rto,
    },
    insurance: {
      amount: insuranceAmount,
      note: 'First-year comprehensive insurance premium (GST included by insurer)',
    },
    accessories: accessoriesCalc,
    extendedWarranty: {
      baseAmount: extendedWarrantyAmount,
      gstRate: GST_RATE_EW,
      gstAmount: ewGst,
      totalWithGst: ewTotalWithGst,
    },
    handlingCharges: {
      baseAmount: handlingCharges,
      gstRate: GST_RATE_HANDLING,
      gstAmount: handlingGst,
      totalWithGst: handlingTotalWithGst,
    },
    discounts: {
      manufacturerDiscount,
      dealerDiscount,
      exchangeBonus,
      loyaltyBonus,
      totalDiscounts,
    },
    tcs: tcsCalc,
    summary: {
      subtotalBeforeDiscounts,
      totalDiscounts,
      priceBeforeTcs,
      tcsAmount: tcsCalc.tcsAmount,
      onRoadPrice,
      formattedOnRoadPrice: formatCurrency(onRoadPrice),
    },
    finance: finance ? {
      ...finance,
      emiBreakup,
    } : null,
    meta: {
      calculatedAt: new Date().toISOString(),
      gstApplied: `${gst.isIntraState ? 'CGST+SGST' : 'IGST'} @ ${GST_RATE_VEHICLES}%`,
      tcsApplied: tcsCalc.tcsApplicable,
      rtoState,
      dealershipState,
    },
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function roundToTwoDecimals(num) {
  return Math.round(num * 100) / 100;
}

function normaliseStateName(state) {
  return state.toLowerCase().replace(/[\s-]/g, '_');
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  calculateQuotation,
  calculateGST,
  calculateRTOCharges,
  calculateTCS,
  calculateAccessories,
  calculateEMI,
  formatCurrency,
  RTO_TAX_RATES,
  GST_RATE_VEHICLES,
  TCS_THRESHOLD,
};

// ─── Sample Usage ─────────────────────────────────────────────────────────────

if (require.main === module) {
  const sampleQuotation = calculateQuotation({
    exShowroomPrice: 850000,
    fuelType: 'petrol',
    dealershipState: 'Maharashtra',
    rtoState: 'Maharashtra',
    colourSurcharge: 10000,
    accessories: [
      { name: 'Floor Mats (Genuine)', price: 4500, quantity: 1, gstRate: 28 },
      { name: 'Seat Covers', price: 8200, quantity: 1, gstRate: 28 },
      { name: 'Body Side Moulding', price: 6800, quantity: 1, gstRate: 28 },
    ],
    insuranceAmount: 45000,
    extendedWarrantyAmount: 15000,
    handlingCharges: 5000,
    manufacturerDiscount: 0,
    dealerDiscount: 20000,
    exchangeBonus: 0,
    loyaltyBonus: 0,
    finance: {
      loanAmount: 800000,
      tenureMonths: 60,
      interestRate: 8.9,
    },
  });

  console.log('\n─── SmartDeal Quotation Calculator ───');
  console.log('\nVehicle:');
  console.log(`  Ex-Showroom:      ${formatCurrency(sampleQuotation.vehicle.exShowroomPrice)}`);
  console.log(`  Colour Surcharge: ${formatCurrency(sampleQuotation.vehicle.colourSurcharge)}`);

  console.log('\nGST:');
  console.log(`  CGST (14%):       ${formatCurrency(sampleQuotation.gst.cgstAmount)}`);
  console.log(`  SGST (14%):       ${formatCurrency(sampleQuotation.gst.sgstAmount)}`);
  console.log(`  Total GST:        ${formatCurrency(sampleQuotation.gst.totalGst)}`);

  console.log('\nRTO (Maharashtra):');
  console.log(`  Road Tax (11%):   ${formatCurrency(sampleQuotation.rto.roadTaxAmount)}`);
  console.log(`  Registration:     ${formatCurrency(sampleQuotation.rto.registrationFee)}`);

  console.log('\nInsurance:        ', formatCurrency(sampleQuotation.insurance.amount));
  console.log('Accessories:      ', formatCurrency(sampleQuotation.accessories.grandTotal));
  console.log('Ext. Warranty:    ', formatCurrency(sampleQuotation.extendedWarranty.totalWithGst));
  console.log('Handling:         ', formatCurrency(sampleQuotation.handlingCharges.totalWithGst));

  console.log('\nDiscounts:');
  console.log(`  Dealer Discount:  -${formatCurrency(sampleQuotation.discounts.dealerDiscount)}`);

  console.log('\nTCS (1% on EX):   ', formatCurrency(sampleQuotation.tcs.tcsAmount));

  console.log('\n────────────────────────────────────');
  console.log(`ON-ROAD PRICE:     ${sampleQuotation.summary.formattedOnRoadPrice}`);
  console.log('────────────────────────────────────');

  if (sampleQuotation.finance?.emiBreakup) {
    const emi = sampleQuotation.finance.emiBreakup;
    console.log(`\nEMI @ ${emi.annualRatePercent}% for ${emi.tenureMonths}m:`);
    console.log(`  Monthly EMI:     ${formatCurrency(emi.emiAmount)}`);
    console.log(`  Total Interest:  ${formatCurrency(emi.totalInterest)}`);
  }
}
