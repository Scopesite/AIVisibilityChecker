import { config, getAiModel } from '../env.js';
import { AIRecommendationsV1Validator } from '../validators/ai.js';
import type { AIRecommendationsV1 } from '../../shared/types/ai.js';


interface SiteSignals {
  title?: string;
  metaDescription?: string;
  h1?: string[];
  logo?: string;
  phone?: string;
  sameAs?: string[];
  hasOrganizationSchema?: boolean;
  hasWebSiteSchema?: boolean;
  hasLocalBusinessSchema?: boolean;
  hasBreadcrumbSchema?: boolean;
  existingSchemaTypes?: string[];
  // Enhanced data from comprehensive analysis
  email?: string;
  address?: string;
  businessType?: string;
  aiVisibilityScore?: number;
  seoScore?: number;
  issues?: string[];
}

interface OpenAIRequest {
  instruction: string;
  url: string;
  siteSignals: SiteSignals;
}

export async function generateAIRecommendations(
  url: string,
  siteSignals: SiteSignals
): Promise<{ success: boolean; recommendations?: AIRecommendationsV1; error?: string }> {
  
  if (!config.OPENAI_API_KEY) {
    return { success: false, error: 'OpenAI API key not configured' };
  }

  try {
    // Create comprehensive analysis prompt with rich SEO data
    const prompt = `You are an AI SEO expert analyzing a website for search engine and AI assistant visibility. Use the comprehensive analysis data provided to generate specific, actionable recommendations.

ANALYSIS DATA:
Website: ${url}
Current AI Visibility Score: ${siteSignals.aiVisibilityScore || 'Unknown'}/100 (${siteSignals.seoScore || 'Unknown'} SEO score)

EXISTING CONTENT:
- Title: "${siteSignals.title || 'Missing'}" (${siteSignals.title?.length || 0} chars)
- Meta Description: "${siteSignals.metaDescription || 'Missing'}" (${siteSignals.metaDescription?.length || 0} chars)
- H1 Tags: ${siteSignals.h1?.length ? siteSignals.h1.map(h => `"${h}"`).join(', ') : 'None found'}

BUSINESS INFORMATION DETECTED:
- Phone: ${siteSignals.phone || 'Not found'}
- Email: ${siteSignals.email || 'Not found'}
- Address: ${siteSignals.address || 'Not found'}
- Logo: ${siteSignals.logo ? 'Found' : 'Not found'}
- Business Type: ${siteSignals.businessType || 'Unknown'}

CURRENT SCHEMA STATUS:
- Existing Schema Types: ${siteSignals.existingSchemaTypes?.length ? siteSignals.existingSchemaTypes.join(', ') : 'None detected'}
- Has Organization Schema: ${siteSignals.hasOrganizationSchema ? 'Yes' : 'No'}
- Has WebSite Schema: ${siteSignals.hasWebSiteSchema ? 'Yes' : 'No'} 
- Has LocalBusiness Schema: ${siteSignals.hasLocalBusinessSchema ? 'Yes' : 'No'}
- Has Breadcrumb Schema: ${siteSignals.hasBreadcrumbSchema ? 'Yes' : 'No'}

SOCIAL MEDIA PRESENCE:
- Social Media Links: ${siteSignals.sameAs?.length ? siteSignals.sameAs.join(', ') : 'None found'}

IDENTIFIED ISSUES:
${siteSignals.issues?.length ? siteSignals.issues.map(issue => `- ${issue}`).join('\n') : '- No major issues detected'}

Based on this comprehensive analysis, return EXACTLY this JSON structure with no wrapper:

{
  "version": "1.0",
  "summary": "Comprehensive analysis summary highlighting key findings and opportunities",
  "prioritised_actions": [
    {
      "task": "High-impact specific task based on the analysis",
      "impact": "high",
      "effort": "low", 
      "where": ["specific page locations"]
    },
    {
      "task": "Medium-impact task example",
      "impact": "med",
      "effort": "med",
      "where": ["specific locations"]
    }
  ],
  "schema_recommendations": [
    {
      "type": "SchemaType", 
      "where": ["head section"],
      "jsonld": { "@context": "https://schema.org", "@type": "SchemaType", "comprehensive": "schema with real business data" },
      "htmlCode": "<script type=\"application/ld+json\">\n{ \"@context\": \"https://schema.org\", \"@type\": \"SchemaType\", \"comprehensive\": \"schema with real business data\" }\n</script>"
    }
  ],
  "notes": ["Additional strategic insights"]
}

REQUIREMENTS:
1. Generate 3-5 prioritised_actions based on the biggest opportunities from the analysis
2. Create comprehensive schema_recommendations with FULL business details (not just basic schemas)
3. Use the actual business information detected (phone, email, address, social links)
4. CRITICAL: ONLY recommend schemas that are MISSING (showing "No" above). Never recommend schemas that already exist (showing "Yes" above)
5. Focus on missing schemas that would have high AI visibility impact (e.g., if Breadcrumb Schema is missing, recommend BreadcrumbList)
6. For each schema recommendation, include both "jsonld" (JSON object) AND "htmlCode" (ready-to-paste HTML with <script type="application/ld+json"> wrapper)
7. Summary should be strategic and reference specific findings from the analysis
8. IMPORTANT: Use ONLY these exact values - impact: "high" | "med" | "low", effort: "low" | "med" | "high" (use "med" not "medium")

Return ONLY the JSON object with real data, no markdown formatting, no wrapper objects.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getAiModel(),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return { success: false, error: `OpenAI API error: ${response.status}` };
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return { success: false, error: 'Invalid OpenAI response format' };
    }

    // Robust parsing with proper error handling
    const content = data.choices[0]?.message?.content ?? "{}";
    
    let obj: any;
    try {
      obj = JSON.parse(content);
    } catch {
      console.error('AI returned invalid JSON:', content);
      return { success: false, error: 'AI returned invalid JSON' };
    }

    // DEBUG: Log raw response for troubleshooting
    console.log('Raw AI response:', JSON.stringify(obj, null, 2));

    // If OpenAI wrapped the response, unwrap it
    if (obj.AIRecommendationsV1) {
      obj = obj.AIRecommendationsV1;
    }
    
    // Map legacy field names if present
    if (obj.actionItems && !obj.prioritised_actions) {
      obj.prioritised_actions = obj.actionItems;
      delete obj.actionItems;
    }
    
    if (obj.schema && !obj.schema_recommendations) {
      obj.schema_recommendations = obj.schema;
      delete obj.schema;
    }

    // Validate with Zod (includes preprocessing for enum normalization)
    const parsed = AIRecommendationsV1Validator.safeParse(obj);
    
    if (!parsed.success) {
      console.error('AI VALIDATION FAIL', 
        parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
      return { success: false, error: 'AI response does not match expected format' };
    }

    console.log('✅ AI validation successful');
    return { success: true, recommendations: parsed.data };

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return { success: false, error: 'Failed to generate AI recommendations' };
  }
}
