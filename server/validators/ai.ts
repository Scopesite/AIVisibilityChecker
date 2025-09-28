import { z } from 'zod';

// Tri-state enum normalizer with comprehensive mapping
const triMap = (value: any): string => {
  if (typeof value !== 'string') return String(value || '').toLowerCase();
  
  const normalized = value.toLowerCase().trim().replace(/[^a-z]/g, '');
  
  // Map all variations to standard tri-state values
  const mappings: Record<string, string> = {
    // High variations
    'high': 'high',
    'hi': 'high', 
    'h': 'high',
    'maximum': 'high',
    'max': 'high',
    'major': 'high',
    
    // Medium variations → 'med'
    'medium': 'med',
    'med': 'med',
    'middle': 'med',
    'mid': 'med',
    'moderate': 'med',
    'average': 'med',
    'normal': 'med',
    'm': 'med',
    
    // Low variations
    'low': 'low',
    'lo': 'low',
    'l': 'low',
    'minimum': 'low',
    'min': 'low',
    'minor': 'low',
    'small': 'low'
  };
  
  return mappings[normalized] || value; // Return original if no mapping found
};

// Create preprocessed tri-state enum schemas
const TriImpact = z.preprocess(triMap, z.enum(['high', 'med', 'low']));
const TriEffort = z.preprocess(triMap, z.enum(['low', 'med', 'high']));

export const AISchemaBlockValidator = z.object({
  type: z.string(),
  where: z.array(z.string()),
  jsonld: z.record(z.any()),
  htmlCode: z.string().optional(), // Ready-to-paste HTML with script wrapper
});

export const AIRecommendationsV1Validator = z.object({
  version: z.literal('1.0'),
  summary: z.string().max(1000),
  prioritised_actions: z.array(
    z.object({
      task: z.string(),
      impact: TriImpact,
      effort: TriEffort,
      where: z.array(z.string()).optional(),
    })
  ),
  schema_recommendations: z.array(AISchemaBlockValidator),
  notes: z.array(z.string()).optional(),
});

// Export for consistency with existing imports
export const AIRecommendationsV1 = AIRecommendationsV1Validator;