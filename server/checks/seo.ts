import type { Page } from 'playwright';
import * as cheerio from 'cheerio';
import { extractH1Evidence } from '../analysis/techEvidence';

// Server-side fallback using Cheerio when browser evaluation fails
async function extractSeoWithCheerio(htmlContent: string) {
  const $ = cheerio.load(htmlContent);
  
  const title = $('title').text() || '';
  const desc = $('meta[name="description"]').attr('content') || '';
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  
  // Extract H1 evidence with selectors and visibility info
  const { h1s: h1Evidence, visibleCount } = extractH1Evidence(htmlContent);
  const h1s = h1Evidence.map(h => h.text); // Keep backward compatibility
  
  const imageCount = $('img').length;
  const internalLinks = $('a[href^="/"], a[href^="."]').length;
  const externalLinks = $('a[href^="http"]').length;
  
  return {
    meta: { title: title, titleLength: title.length, desc: desc, descLength: desc.length, canonical: canonical },
    headings: { h1Count: visibleCount, h1s: h1s, h1Evidence: h1Evidence },
    media: { imageCount: imageCount },
    links: { internal: internalLinks, external: externalLinks }
  };
}

export async function runSeoChecks(page: Page) {
  // Wait for page to be ready and content to stabilize
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // Give time for dynamic content to load

  try {
    return await page.evaluate(`(() => {
      function safeGetAttribute(selector, attribute) {
        const element = document.querySelector(selector);
        return element ? (element.getAttribute(attribute) || '') : '';
      }

      const title = document.title || '';
      const desc = safeGetAttribute('meta[name="description"]', 'content');
      
      const canonicalElement = document.querySelector('link[rel="canonical"]');
      const canonical = canonicalElement ? (canonicalElement.getAttribute('href') || '') : '';
      
      const h1Elements = document.querySelectorAll('h1');
      const h1s = [];
      const h1Evidence = [];
      
      function isElementHidden(el) {
        if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return true;
        const style = el.style.cssText.toLowerCase();
        if (style.includes('display:none') || style.includes('visibility:hidden')) return true;
        return false;
      }
      
      function getElementSelector(el) {
        const parts = [];
        let current = el;
        for (let depth = 0; current && depth < 6; depth++) {
          const tag = current.tagName.toLowerCase();
          if (current.id) {
            parts.unshift(tag + '#' + current.id);
            break;
          }
          const classes = Array.from(current.classList).slice(0, 2).join('.');
          const siblings = Array.from(current.parentElement?.children || []).filter(s => s.tagName === current.tagName);
          const index = siblings.indexOf(current) + 1;
          const selector = classes ? tag + '.' + classes + ':nth-of-type(' + index + ')' : tag + ':nth-of-type(' + index + ')';
          parts.unshift(selector);
          current = current.parentElement;
        }
        return parts.join(' > ');
      }
      
      for (let i = 0; i < h1Elements.length; i++) {
        const el = h1Elements[i];
        const text = el.textContent ? el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 160) : '';
        const hidden = isElementHidden(el);
        
        h1Evidence.push({
          text: text || '(empty)',
          selector: getElementSelector(el),
          hidden: hidden
        });
        
        if (text && !hidden) {
          h1s.push(text);
        }
      }
      
      const imgs = document.images ? document.images.length : 0;
      
      const internalLinkElements = document.querySelectorAll('a[href^="/"], a[href^="."]');
      const internalLinks = internalLinkElements ? internalLinkElements.length : 0;
      
      const externalLinkElements = document.querySelectorAll('a[href^="http"]');
      const externalLinks = externalLinkElements ? externalLinkElements.length : 0;

      return {
        meta: { title: title, titleLength: title.length, desc: desc, descLength: desc.length, canonical: canonical },
        headings: { h1Count: h1s.length, h1s: h1s, h1Evidence: h1Evidence },
        media: { imageCount: imgs },
        links: { internal: internalLinks, external: externalLinks }
      };
    })()`);
  } catch (error) {
    console.log('⚠️ SEO evaluation failed, trying Cheerio server-side fallback:', (error as Error).message);
    
    // Advanced Fallback: Use Cheerio to parse HTML content server-side
    try {
      const htmlContent = await page.content();
      console.log('🔧 Using Cheerio server-side HTML parsing as fallback');
      return await extractSeoWithCheerio(htmlContent);
    } catch (cheerioError) {
      console.log('⚠️ Cheerio fallback failed, trying basic page.title():', (cheerioError as Error).message);
      
      // Final fallback: Extract basic data using simpler methods
      try {
        const title = await page.title();
        return {
          meta: { 
            title: title || '', 
            titleLength: (title || '').length, 
            desc: '', 
            descLength: 0, 
            canonical: '' 
          },
          headings: { h1Count: 0, h1s: [], h1Evidence: [] },
          media: { imageCount: 0 },
          links: { internal: 0, external: 0 }
        };
      } catch (finalFallbackError) {
        console.log('❌ All SEO extraction methods failed:', (finalFallbackError as Error).message);
        return {
          meta: { title: 'Unknown', titleLength: 7, desc: '', descLength: 0, canonical: '' },
          headings: { h1Count: 0, h1s: [], h1Evidence: [] },
          media: { imageCount: 0 },
          links: { internal: 0, external: 0 }
        };
      }
    }
  }
}