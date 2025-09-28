// types/scan.ts
import type { SEOAnalysisV2 } from "./seo";
import type { z } from 'zod';
import type { AIRecommendationsV1Validator } from "../validators/ai";

export type AIRecommendationsV1 = z.infer<typeof AIRecommendationsV1Validator>;

export type ScanResultV1 = {
  cost: number;                      // 1
  remainingCredits: number;
  analysis: SEOAnalysisV2;
  ai: AIRecommendationsV1;
};