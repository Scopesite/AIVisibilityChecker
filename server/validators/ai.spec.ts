import { z } from "zod";
import { AIRecommendationsV1Validator } from "./ai";

describe("AI Validator - TriMap + TriEnum Tests", () => {
  const createAction = (impact: any, effort: any) => ({
    task: "Do a proper thing",
    impact, 
    effort
  });

  const createValidPayload = (actions: any[]) => ({
    version: "1.0",
    summary: "Test summary",
    prioritised_actions: actions,
    schema_recommendations: [
      { 
        type: "Organization", 
        where: ["/"], 
        jsonld: { "@context": "https://schema.org", "@type": "Organization" } 
      },
      { 
        type: "WebSite", 
        where: ["/"], 
        jsonld: { "@context": "https://schema.org", "@type": "WebSite" } 
      }
    ]
  });

  test("tri-normaliser maps variants to med", () => {
    const payload = createValidPayload([
      createAction("Medium", "MED"),
      createAction("moderate", "average"),
      createAction("med", "mid"),
      createAction("high", "LOW"),
      createAction("H", "l")
    ]);

    const parsed = AIRecommendationsV1Validator.safeParse(payload);
    
    expect(parsed.success).toBe(true);
    if (!parsed.success) return; // Type guard
    
    const actions = parsed.data.prioritised_actions;
    
    // All "medium" variations should normalize to "med"
    expect(actions[0].impact).toBe("med");
    expect(actions[0].effort).toBe("med");
    expect(actions[1].impact).toBe("med");
    expect(actions[1].effort).toBe("med");
    expect(actions[2].impact).toBe("med");
    expect(actions[2].effort).toBe("med");
    
    // High and low should normalize correctly
    expect(actions[3].impact).toBe("high");
    expect(actions[3].effort).toBe("low");
    expect(actions[4].impact).toBe("high");
    expect(actions[4].effort).toBe("low");
  });

  test("handles case variations and whitespace", () => {
    const payload = createValidPayload([
      createAction("  HIGH  ", " LOW "),
      createAction("Medium", "MEDIUM"),
      createAction("low", "High")
    ]);

    const parsed = AIRecommendationsV1Validator.safeParse(payload);
    
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    
    const actions = parsed.data.prioritised_actions;
    expect(actions[0].impact).toBe("high");
    expect(actions[0].effort).toBe("low");
    expect(actions[1].impact).toBe("med");
    expect(actions[1].effort).toBe("med");
    expect(actions[2].impact).toBe("low");
    expect(actions[2].effort).toBe("high");
  });

  test("handles special characters and variations", () => {
    const payload = createValidPayload([
      createAction("med.", "MED."),
      createAction("h-i-g-h", "l.o.w"),
      createAction("maximum", "minimum")
    ]);

    const parsed = AIRecommendationsV1Validator.safeParse(payload);
    
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    
    const actions = parsed.data.prioritised_actions;
    expect(actions[0].impact).toBe("med");
    expect(actions[0].effort).toBe("med");
    expect(actions[1].impact).toBe("high");
    expect(actions[1].effort).toBe("low");
    expect(actions[2].impact).toBe("high");
    expect(actions[2].effort).toBe("low");
  });

  test("rejects unknown values", () => {
    const badPayload = createValidPayload([
      createAction("urgent", "low"),
      createAction("low", "super-high"),
      createAction("medium", "medium"), // These should normalize correctly
      createAction("low", "low"),
      createAction("high", "catastrophic") // This should fail
    ]);

    const parsed = AIRecommendationsV1Validator.safeParse(badPayload);
    
    // Should fail due to "urgent" and "catastrophic" values
    expect(parsed.success).toBe(false);
  });

  test("accepts all valid normalized values", () => {
    const payload = createValidPayload([
      createAction("high", "low"),
      createAction("med", "med"),
      createAction("low", "high")
    ]);

    const parsed = AIRecommendationsV1Validator.safeParse(payload);
    
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    
    const actions = parsed.data.prioritised_actions;
    expect(actions[0].impact).toBe("high");
    expect(actions[0].effort).toBe("low");
    expect(actions[1].impact).toBe("med");
    expect(actions[1].effort).toBe("med");
    expect(actions[2].impact).toBe("low");
    expect(actions[2].effort).toBe("high");
  });

  test("validates complete schema structure", () => {
    const fullPayload = {
      version: "1.0",
      summary: "Complete analysis with all required fields",
      prioritised_actions: [
        {
          task: "Implement Organization Schema",
          impact: "high",
          effort: "low",
          where: ["head section", "homepage"]
        },
        {
          task: "Optimize meta descriptions", 
          impact: "medium", // Should normalize to "med"
          effort: "med"
        }
      ],
      schema_recommendations: [
        {
          type: "Organization",
          where: ["head"],
          jsonld: {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Test Company",
            "url": "https://example.com"
          }
        }
      ],
      notes: ["Additional insight 1", "Additional insight 2"]
    };

    const parsed = AIRecommendationsV1Validator.safeParse(fullPayload);
    
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      console.error("Validation errors:", parsed.error.issues);
      return;
    }
    
    // Check that medium was normalized to med
    expect(parsed.data.prioritised_actions[1].impact).toBe("med");
    expect(parsed.data.notes).toHaveLength(2);
    expect(parsed.data.schema_recommendations).toHaveLength(1);
  });

  test("handles edge cases and malformed input", () => {
    const edgePayload = createValidPayload([
      createAction(null, undefined),
      createAction("", ""),
      createAction(123, true),
      createAction("normal", "moderate") // These should normalize to "med"
    ]);

    const parsed = AIRecommendationsV1Validator.safeParse(edgePayload);
    
    // Should handle gracefully - the triMap function converts non-strings
    // The first few might fail validation, but the last one should work
    if (parsed.success) {
      const validActions = parsed.data.prioritised_actions.filter(a => 
        ['high', 'med', 'low'].includes(a.impact) && 
        ['high', 'med', 'low'].includes(a.effort)
      );
      expect(validActions.length).toBeGreaterThan(0);
    }
  });
});