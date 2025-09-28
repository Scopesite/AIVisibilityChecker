// urlSecurity.ts - SSRF Protection and URL Security Utils
import { parse as parseUrl } from 'url';
import { isIP } from 'net';
import { promisify } from 'util';
import { lookup } from 'dns';

const dnsLookup = promisify(lookup);

export class SSRFError extends Error {
  constructor(message: string, public readonly reason: string) {
    super(message);
    this.name = 'SSRFError';
  }
}

// Private IP ranges that should be blocked
const PRIVATE_IP_RANGES = [
  // IPv4 Localhost
  { start: '127.0.0.0', end: '127.255.255.255' },
  // IPv4 Private ranges (RFC1918)
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  // IPv4 Link-local (APIPA)
  { start: '169.254.0.0', end: '169.254.255.255' },
  // IPv4 Multicast
  { start: '224.0.0.0', end: '239.255.255.255' },
  // IPv4 Reserved ranges
  { start: '0.0.0.0', end: '0.255.255.255' },
  { start: '100.64.0.0', end: '100.127.255.255' }, // RFC6598 (CGN)
  { start: '192.0.0.0', end: '192.0.0.255' }, // RFC6890
  { start: '192.0.2.0', end: '192.0.2.255' }, // RFC5737 (TEST-NET-1)
  { start: '198.18.0.0', end: '198.19.255.255' }, // RFC2544 (benchmarking)
  { start: '198.51.100.0', end: '198.51.100.255' }, // RFC5737 (TEST-NET-2)
  { start: '203.0.113.0', end: '203.0.113.255' }, // RFC5737 (TEST-NET-3)
  { start: '240.0.0.0', end: '255.255.255.255' }, // RFC1112 (reserved)
];

// IPv6 ranges that should be blocked
const PRIVATE_IPV6_PATTERNS = [
  /^::1$/, // IPv6 localhost
  /^::$/, // IPv6 any
  /^fe80:/i, // IPv6 link-local
  /^fc00:/i, // IPv6 unique local
  /^fd00:/i, // IPv6 unique local
  /^ff00:/i, // IPv6 multicast
  /^2001:db8:/i, // RFC3849 documentation
];

// Blocked protocols
const BLOCKED_PROTOCOLS = [
  'file:', 'ftp:', 'ftps:', 'gopher:', 'ldap:', 'ldaps:',
  'dict:', 'ssh:', 'sftp:', 'tftp:', 'telnet:', 'jar:', 
  'netdoc:', 'mailto:', 'news:', 'imap:', 'smb:', 'cifs:',
  'data:', 'javascript:', 'vbscript:'
];

// Dangerous hostnames/patterns
const BLOCKED_HOSTNAMES = [
  'localhost',
  '0.0.0.0',
  'metadata.google.internal',
  'link-local',
  '[::]', // IPv6 any
];

/**
 * Convert IPv4 address to 32-bit integer for range comparison
 */
function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(part => parseInt(part, 10));
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Check if an IPv4 address is in a private/dangerous range
 */
function isPrivateIPv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  
  for (const range of PRIVATE_IP_RANGES) {
    const startInt = ipv4ToInt(range.start);
    const endInt = ipv4ToInt(range.end);
    if (ipInt >= startInt && ipInt <= endInt) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if an IPv6 address is in a private/dangerous range
 */
function isPrivateIPv6(ip: string): boolean {
  const normalizedIP = ip.toLowerCase();
  return PRIVATE_IPV6_PATTERNS.some(pattern => pattern.test(normalizedIP));
}

/**
 * Check if an IP address (v4 or v6) is private/dangerous
 */
function isPrivateIP(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    return isPrivateIPv4(ip);
  } else if (version === 6) {
    return isPrivateIPv6(ip);
  }
  return false; // Not a valid IP
}

/**
 * Resolve hostname to IP and check if it's safe
 */
async function validateHostnameResolution(hostname: string): Promise<void> {
  try {
    const result = await dnsLookup(hostname, { all: true });
    const addresses = Array.isArray(result) ? result : [result];
    
    for (const addr of addresses) {
      const ip = typeof addr === 'string' ? addr : addr.address;
      
      if (isPrivateIP(ip)) {
        throw new SSRFError(
          `Hostname resolves to private/internal IP address: ${ip}`,
          'DNS_RESOLVES_TO_PRIVATE_IP'
        );
      }
    }
  } catch (error) {
    if (error instanceof SSRFError) {
      throw error;
    }
    // DNS resolution failed - this could be legitimate (domain doesn't exist)
    // or it could be an attempt to bypass checks, so we'll be conservative
    const errorMessage = error instanceof Error ? error.message : 'Unknown DNS error';
    throw new SSRFError(
      `DNS resolution failed for hostname: ${hostname} - ${errorMessage}`,
      'DNS_RESOLUTION_FAILED'
    );
  }
}

/**
 * Validate and sanitize a URL for security
 */
export async function validateUrl(url: string): Promise<string> {
  if (!url || typeof url !== 'string') {
    throw new SSRFError('URL must be a non-empty string', 'INVALID_URL_FORMAT');
  }
  
  // Trim and check for obviously malicious patterns
  url = url.trim();
  
  if (url.length > 2048) {
    throw new SSRFError('URL too long (max 2048 characters)', 'URL_TOO_LONG');
  }
  
  if (url.includes('\n') || url.includes('\r') || url.includes('\t')) {
    throw new SSRFError('URL contains invalid characters', 'INVALID_CHARACTERS');
  }
  
  let parsedUrl;
  try {
    parsedUrl = parseUrl(url);
  } catch (error) {
    throw new SSRFError('Invalid URL format', 'INVALID_URL_FORMAT');
  }
  
  if (!parsedUrl.protocol || !parsedUrl.hostname) {
    throw new SSRFError('URL missing required protocol or hostname', 'MISSING_PROTOCOL_OR_HOSTNAME');
  }
  
  // Check protocol
  const protocol = parsedUrl.protocol.toLowerCase();
  if (!['http:', 'https:'].includes(protocol)) {
    throw new SSRFError(
      `Protocol "${protocol}" not allowed. Only HTTP and HTTPS are permitted.`,
      'BLOCKED_PROTOCOL'
    );
  }
  
  // Check for blocked protocols in the URL string (to catch sneaky encoding)
  const lowerUrl = url.toLowerCase();
  for (const blockedProtocol of BLOCKED_PROTOCOLS) {
    if (lowerUrl.includes(blockedProtocol)) {
      throw new SSRFError(
        `Blocked protocol detected in URL: ${blockedProtocol}`,
        'BLOCKED_PROTOCOL'
      );
    }
  }
  
  const hostname = parsedUrl.hostname!.toLowerCase();
  
  // Check for blocked hostnames
  for (const blocked of BLOCKED_HOSTNAMES) {
    if (hostname === blocked || hostname.includes(blocked)) {
      throw new SSRFError(
        `Hostname "${hostname}" is blocked for security reasons`,
        'BLOCKED_HOSTNAME'
      );
    }
  }
  
  // Check if hostname is already an IP address
  const ipVersion = isIP(hostname);
  if (ipVersion) {
    if (isPrivateIP(hostname)) {
      throw new SSRFError(
        `Direct IP access to private/internal addresses is blocked: ${hostname}`,
        'PRIVATE_IP_ACCESS'
      );
    }
  } else {
    // Resolve hostname and validate IPs
    await validateHostnameResolution(hostname);
  }
  
  // Check port restrictions
  const port = parsedUrl.port;
  if (port) {
    const portNum = parseInt(port, 10);
    
    // Block common internal/admin ports
    const blockedPorts = [
      22, 23, 25, 53, 135, 139, 445, 993, 995, // System ports
      3306, 5432, 6379, 27017, 9200, 9300, // Database ports
      8080, 8443, 9090, 9091, 9092, // Admin/management ports
      2375, 2376, // Docker
      4243, 4244, // Docker Swarm
      2379, 2380, // etcd
      6443, 10250, 10255, // Kubernetes
    ];
    
    if (blockedPorts.includes(portNum)) {
      throw new SSRFError(
        `Port ${portNum} is blocked for security reasons`,
        'BLOCKED_PORT'
      );
    }
  }
  
  return url;
}

/**
 * Create a secure fetch function with SSRF protection
 */
export async function secureUrlFetch(url: string, options: {
  method?: string;
  headers?: Record<string, string>;
  timeout?: number;
  maxSize?: number;
} = {}): Promise<{ 
  ok: boolean; 
  status: number; 
  text: () => Promise<string>;
  headers: any;
}> {
  // Validate URL first
  const validatedUrl = await validateUrl(url);
  
  const {
    method = 'GET',
    headers = {},
    timeout = 10000, // 10 seconds default
    maxSize = 5 * 1024 * 1024, // 5MB default
  } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(validatedUrl, {
      method,
      headers: {
        'User-Agent': 'ScopeBot/1.0 Security Scanner (+https://scopesite.co.uk)',
        ...headers
      },
      signal: controller.signal,
      redirect: 'manual', // Don't follow redirects automatically
      size: maxSize,
    });
    
    clearTimeout(timeoutId);
    
    // Check for redirect attempts to private IPs
    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (location) {
        // Validate redirect URL
        await validateUrl(location);
      }
    }
    
    return {
      ok: response.ok,
      status: response.status,
      text: () => response.text(),
      headers: response.headers,
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SSRFError('Request timeout exceeded', 'REQUEST_TIMEOUT');
    }
    
    if (error instanceof Error && (error as any).code === 'EMSGSIZE') {
      throw new SSRFError('Response too large', 'RESPONSE_TOO_LARGE');
    }
    
    // Don't expose internal error details
    const errorMessage = error instanceof Error ? error.message : 'Unknown fetch error';
    throw new SSRFError('Request failed due to security restrictions', 'REQUEST_BLOCKED');
  }
}

/**
 * Check if an error is an SSRF security error
 */
export function isSSRFError(error: any): error is SSRFError {
  return error instanceof SSRFError;
}

/**
 * Get a safe error message for logging (without exposing internal details)
 */
export function getSafeErrorMessage(error: any): string {
  if (isSSRFError(error)) {
    return `Security validation failed: ${error.reason}`;
  }
  
  return 'Request failed due to security restrictions';
}

/**
 * Normalize and validate target URL as specified in VOICE Scanner spec
 * Enhanced version that integrates with existing security infrastructure
 */
export async function normaliseTarget(input: string): Promise<{
  href: string;
  domain: string;
}> {
  if (!input || typeof input !== 'string') {
    throw new Error("INVALID_INPUT");
  }

  // Add https if no protocol specified
  const urlString = input.startsWith("http") ? input : `https://${input}`;
  
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch (error) {
    throw new Error("BAD_PROTOCOL");
  }

  // Validate protocol
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    throw new Error("BAD_PROTOCOL");
  }

  // Use existing comprehensive validation
  try {
    await validateUrl(parsedUrl.toString());
  } catch (error) {
    if (isSSRFError(error)) {
      if (error.reason.includes('PRIVATE') || error.reason.includes('INTERNAL')) {
        throw new Error("PRIVATE_ADDRESS");
      }
      if (error.reason.includes('PROTOCOL')) {
        throw new Error("BAD_PROTOCOL");
      }
    }
    throw error;
  }

  // Clean up URL - remove hash and query as specified in VOICE Scanner spec
  parsedUrl.hash = "";
  parsedUrl.search = "";
  
  return {
    href: parsedUrl.toString(),
    domain: parsedUrl.hostname
  };
}

/**
 * Simple helper function matching spec interface exactly
 * Uses existing comprehensive security infrastructure
 */
function isPrivate(ip: string): boolean {
  return isPrivateIP(ip);
}