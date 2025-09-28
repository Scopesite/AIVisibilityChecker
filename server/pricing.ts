/**
 * VOICE Scanner Pricing System - 5-Tier Credit Structure
 * Exact implementation from specification
 */

// LIVE Mode Pricing - One-time credit purchases only
export type PlanKey = "starter" | "pro";

export const PRICING: Record<PlanKey, {
  name: string;
  price: number; // One-time price in GBP
  credits: number;
  pencePerCredit: number;
}> = {
  starter: {
    name: "Starter Pack",
    price: 29, // £29.00 one-time
    credits: 50,
    pencePerCredit: 58 // £29.00 / 50 credits = 58p per credit
  },
  pro: {
    name: "Pro Pack", 
    price: 99, // £99.00 one-time
    credits: 250,
    pencePerCredit: 40 // £99.00 / 250 credits = 39.6p per credit
  }
};

export const CREDIT_COST = {
  basic: 1,  // 1 credit for basic scan
  deep: 2    // 2 credits for deep scan (mobile + desktop)
} as const;

/**
 * Calculate value per credit for pricing comparison
 */
export function getCreditValue(planKey: PlanKey): {
  priceGBP: number;
  credits: number;
  pencePerCredit: number;
  valueDescription: string;
} {
  const plan = PRICING[planKey];
  
  return {
    priceGBP: plan.price,
    credits: plan.credits,
    pencePerCredit: plan.pencePerCredit,
    valueDescription: `£${plan.price} for ${plan.credits} credits (${plan.pencePerCredit}p per credit)`
  };
}

/**
 * Get plan details with pricing information
 */
export function getPlanDetails(planKey: PlanKey) {
  const plan = PRICING[planKey];
  const value = getCreditValue(planKey);
  
  return {
    ...plan,
    value,
    // Additional computed fields
    creditsPerPound: Math.round(plan.credits / plan.price * 100) / 100,
    recommendedFor: getRecommendation(planKey)
  };
}

/**
 * Get usage recommendations for each tier
 */
function getRecommendation(planKey: PlanKey): string {
  switch (planKey) {
    case "starter":
      return "Perfect for testing and small projects";
    case "pro":
      return "Great for small teams and growing businesses";
    default:
      return "Custom solution for your needs";
  }
}

/**
 * Validate plan key
 */
export function isValidPlanKey(key: string): key is PlanKey {
  return key in PRICING;
}

/**
 * Get all available plans
 */
export function getAllPlans() {
  return Object.keys(PRICING).map(key => ({
    key: key as PlanKey,
    ...getPlanDetails(key as PlanKey)
  }));
}

/**
 * Find the best plan for a given usage requirement
 */
export function suggestPlan(expectedCredits: number): {
  recommended: PlanKey;
  alternatives: PlanKey[];
  reason: string;
  costEfficiency: string;
} {
  const plans = getAllPlans();
  
  // Find plans that can handle the expected usage
  const suitablePlans = plans.filter(plan => plan.credits >= expectedCredits);
  
  if (suitablePlans.length === 0) {
    return {
      recommended: "pro",
      alternatives: ["pro"],
      reason: "Your usage exceeds our largest plan. Consider multiple Pro packs.",
      costEfficiency: "Multiple purchases may be needed"
    };
  }
  
  // Sort by best value (lowest pence per credit)
  suitablePlans.sort((a, b) => {
    if (a.pencePerCredit !== b.pencePerCredit) {
      return a.pencePerCredit - b.pencePerCredit;
    }
    // Tie-break: minimize overbuying (closest to requirements)
    const aOvercapacity = a.credits - expectedCredits;
    const bOvercapacity = b.credits - expectedCredits;
    return aOvercapacity - bOvercapacity;
  });
  
  const recommended = suitablePlans[0];
  const utilization = Math.round(expectedCredits / recommended.credits * 100);
  
  return {
    recommended: recommended.key,
    alternatives: suitablePlans.slice(1).map(p => p.key),
    reason: `${recommended.name} offers the best value for ${expectedCredits} credits at ${utilization}% utilization`,
    costEfficiency: `${recommended.pencePerCredit}p per credit`
  };
}