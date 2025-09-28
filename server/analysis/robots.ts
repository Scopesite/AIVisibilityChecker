import fetch from "node-fetch";
import robotsParser from "robots-parser";
import { AI_BOTS } from "../constants/aiBots";

export async function fetchRobots(origin: string) {
  const url = new URL("/robots.txt", origin).toString();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const text = res.ok ? await res.text() : "";
    const parser = robotsParser(url, text || "");
    return { url, text, parser };
  } catch (error) {
    console.warn(`Failed to fetch robots.txt from ${url}:`, error);
    return { url, text: "", parser: robotsParser(url, "") };
  }
}

export async function checkAiBots(origin: string) {
  const { url, text, parser } = await fetchRobots(origin);
  const path = "/"; // root check
  
  const results = AI_BOTS.map(b => {
    const allowedRoot = parser.isAllowed(origin + path, b.directive);
    const disallowedRoot = parser.isDisallowed(origin + path, b.directive);
    
    return {
      bot: b.name,
      directive: b.directive,
      allowedRoot,
      disallowedRoot,
      docs: b.docs,
      fixLines: allowedRoot ? [] : fixesFor(b.directive, allowedRoot),
      note: getNote(text, b.directive, allowedRoot, disallowedRoot)
    };
  });
  
  return { robotsUrl: url, robotsText: text, results };
}

export function fixesFor(bot: string, allowed: boolean | undefined) {
  if (allowed) return [];
  
  return [
    `# Allow ${bot} to access root`,
    `User-agent: ${bot}`,
    `Allow: /`
  ];
}

function getNote(robotsText: string, directive: string, allowed: boolean | undefined, disallowed: boolean | undefined): string | undefined {
  // Check for wildcard disallow overridden by specific allow
  if (allowed && robotsText.includes("User-agent: *") && robotsText.includes("Disallow: /")) {
    if (robotsText.includes(`User-agent: ${directive}`) && robotsText.includes("Allow: /")) {
      return "overrides wildcard";
    }
  }
  
  return undefined;
}