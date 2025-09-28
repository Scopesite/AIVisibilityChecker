import type { Page } from 'playwright';
import { analyzeSchemas } from '../utils/schema-utils';

export async function runSchemaChecks(page: Page) {
  const rawSchemas = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const schemas = [];
    
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        schemas.push(data);
      } catch (e) {
        // Invalid JSON-LD, skip
        console.warn('Failed to parse JSON-LD:', e);
      }
    }
    
    return schemas;
  });

  // Analyze schemas using the new utility
  const analysis = analyzeSchemas(rawSchemas);
  
  return {
    jsonLdCount: analysis.count,
    schemas: rawSchemas,
    types: analysis.types, // Array of mapped type labels
    typesString: analysis.typesString, // Comma-separated for backward compatibility
    hasOrganization: analysis.hasOrganization,
    hasWebSite: analysis.hasWebSite,
    hasLocalBusiness: analysis.hasOrganization, // LocalBusiness is a type of Organization
    hasBreadcrumb: analysis.hasBreadcrumb,
    hasStructuredData: analysis.hasStructuredData
  };
}