// shared/types/ai.ts

export type AISchemaBlock = {
  type: string;            // e.g., "Organization","WebSite","LocalBusiness"
  where: string[];         // e.g., ["/", "/contact"]
  jsonld: Record<string, any>;
};

export type AIRecommendationsV1 = {
  version: "1.0";
  summary: string;         // ≤120 words
  prioritised_actions: {
    task: string;
    impact: "high"|"med"|"low";
    effort: "low"|"med"|"high";
    where?: string[];
  }[];
  schema_recommendations: AISchemaBlock[];
  notes?: string[];
};

