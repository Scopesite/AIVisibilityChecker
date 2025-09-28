/**
 * Schema type mapping utility for V.O.I.C.E Scanner
 * Converts raw @type values to user-friendly labels and handles unknown types
 */

const TYPE_LABELS: Record<string, string> = {
  Organization: "Organization",
  LocalBusiness: "LocalBusiness", 
  WebSite: "WebSite",
  WebPage: "WebPage",
  Article: "Article",
  BlogPosting: "BlogPosting",
  FAQPage: "FAQPage", 
  HowTo: "HowTo",
  Product: "Product",
  BreadcrumbList: "BreadcrumbList",
  ImageObject: "Image",
  VideoObject: "Video",
  Person: "Person",
  Place: "Place",
  Event: "Event",
  Review: "Review",
  Recipe: "Recipe",
  Course: "Course",
  JobPosting: "JobPosting",
  Service: "Service",
  Offer: "Offer",
  ContactPoint: "ContactPoint",
  PostalAddress: "PostalAddress"
};

/**
 * Extract and normalize schema types from JSON-LD data
 * @param schemas Array of parsed JSON-LD objects
 * @returns Array of mapped type labels
 */
export function extractSchemaTypes(schemas: any[]): string[] {
  const allTypes = new Set<string>();
  
  schemas.forEach(schema => {
    if (schema && schema['@type']) {
      const types = Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']];
      types.forEach((type: string) => {
        if (typeof type === 'string') {
          allTypes.add(type);
        }
      });
    }
  });
  
  return labelTypes(Array.from(allTypes));
}

/**
 * Map raw schema types to user-friendly labels
 * @param types Array of raw @type values
 * @returns Array of mapped labels or fallback
 */
export function labelTypes(types: string[]): string[] {
  const flatTypes = types.flatMap(t => Array.isArray(t) ? t : [t]);
  const uniqueTypes = Array.from(new Set(flatTypes));
  const mapped = uniqueTypes.map(t => TYPE_LABELS[t]).filter(Boolean) as string[];
  
  // If no types mapped, return fallback. If some mapped, only return mapped ones.
  return mapped.length > 0 ? mapped : (uniqueTypes.length > 0 ? ["Other schema types"] : []);
}

/**
 * Count detected JSON-LD blocks and get summary
 * @param schemas Array of parsed JSON-LD objects
 * @returns Schema analysis summary
 */
export function analyzeSchemas(schemas: any[]) {
  const types = extractSchemaTypes(schemas);
  
  return {
    count: schemas.length,
    types,
    typesString: types.join(', '), // For backward compatibility
    hasOrganization: types.includes('Organization') || types.includes('LocalBusiness'),
    hasWebSite: types.includes('WebSite'),
    hasBreadcrumb: types.includes('BreadcrumbList'),
    hasStructuredData: types.length > 0
  };
}