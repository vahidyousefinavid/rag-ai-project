import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright-extra';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import type { BrowserContext } from 'playwright';
import type { CompanyInfo } from './entities/monitor-target.entity';

// Plain `module.exports = fn` (CJS) packages, pulled in via plain `require()` rather than
// `import` — the project's tsconfig doesn't set `esModuleInterop`, so a default `import`
// would wrongly look for a `.default` property that doesn't exist on these at runtime;
// robots-parser's own .d.ts is also malformed (a self-referencing shorthand ambient
// declaration), so we type it manually below instead of trusting its bundled typings.
import StealthPlugin = require('puppeteer-extra-plugin-stealth');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const robotsParser: (url: string, contents: string) => RobotsRules = require('robots-parser');

chromium.use(StealthPlugin());

// Node's global fetch (used below for robots.txt/sitemap.xml) doesn't read HTTP_PROXY/HTTPS_PROXY
// either — route it through the same proxy as the browser so networks that need a local proxy to
// reach the outside world at all don't silently lose robots.txt/sitemap discovery.
{
  const proxy = resolveProxyFromEnv();
  if (proxy) {
    const auth = proxy.username ? `${proxy.username}:${proxy.password ?? ''}` : undefined;
    setGlobalDispatcher(new ProxyAgent({ uri: proxy.server, token: auth ? `Basic ${Buffer.from(auth).toString('base64')}` : undefined }));
  }
}

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

export interface LoginConfig {
  loginUrl: string;
  username: string;
  password: string;
  /** Optional CSS selector overrides — used when the generic heuristics below don't match the login form. */
  usernameSelector?: string | null;
  passwordSelector?: string | null;
  submitSelector?: string | null;
}

interface RobotsRules {
  isAllowed(url: string, ua?: string): boolean | undefined;
  getCrawlDelay(ua?: string): number | undefined;
  getSitemaps(): string[];
}

const DEFAULT_USERNAME_SELECTOR = 'input[type="text"], input[type="email"], input[type="tel"], input[name*="user" i], input[name*="mobile" i], input[id*="user" i]';
const DEFAULT_PASSWORD_SELECTOR = 'input[type="password"]';
const DEFAULT_SUBMIT_SELECTOR = 'button[type="submit"], input[type="submit"], button:has-text("ورود"), button:has-text("Login")';

const MAX_DEPTH = 2;
const CONCURRENCY = 4;
const NAV_TIMEOUT_MS = 20000;
const MAX_RETRIES = 2;
const DEFAULT_DELAY_MS = 350;
const MAX_DELAY_MS = 4000;
const MAX_CONSECUTIVE_FAILURES = 6;
const MAX_BLOCK_SIGNALS = 4;
const MAX_IDLE_TICKS = 20;
const IDLE_TICK_MS = 50;

/**
 * User-agent token we identify as to robots.txt (separate from the rotating browser
 * User-Agent header used for rendering) — keeps us honest with robots.txt while still
 * not fingerprinting as an obvious headless bot to basic client-side detection scripts.
 */
const ROBOTS_UA_TOKEN = 'ScraperBot';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
];

const SKIP_EXTENSIONS = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp', 'avif',
  'zip', 'rar', '7z', 'tar', 'gz',
  'mp3', 'mp4', 'avi', 'mov', 'wmv', 'wav', 'ogg', 'webm',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'exe', 'dmg', 'apk', 'iso',
  'css', 'js', 'woff', 'woff2', 'ttf', 'eot', 'json', 'xml', 'rss',
]);

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'yclid', 'msclkid', 'igshid', 'mc_cid', 'mc_eid', 'ref_src',
];

const SOCIAL_DOMAINS: Record<string, string> = {
  'instagram.com': 'instagram',
  'linkedin.com': 'linkedin',
  't.me': 'telegram',
  'telegram.me': 'telegram',
  'twitter.com': 'twitter',
  'x.com': 'twitter',
  'facebook.com': 'facebook',
  'wa.me': 'whatsapp',
  'youtube.com': 'youtube',
  'aparat.com': 'aparat',
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const MOBILE_RE = /(?:\+98|0)?9\d{9}\b/g;
const LANDLINE_RE = /\b0\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}\b/g;
const ADDRESS_LINE_RE = /(آدرس|نشانی|address)\s*[:ـ]?\s*/i;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Playwright's browser process doesn't inherit HTTP_PROXY/HTTPS_PROXY env vars the way
 * regular Node HTTP clients do — it needs the proxy passed explicitly to `launch()`. Many
 * networks (corporate, or ISPs that filter/throttle direct access) route through a local
 * proxy for exactly this reason, so without this the crawler silently times out on sites
 * that are perfectly reachable through the configured proxy.
 */
function resolveProxyFromEnv(): { server: string; username?: string; password?: string } | undefined {
  const raw = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || process.env.ALL_PROXY || process.env.all_proxy;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return {
      server: `${u.protocol}//${u.host}`,
      username: u.username ? decodeURIComponent(u.username) : undefined,
      password: u.password ? decodeURIComponent(u.password) : undefined,
    };
  } catch {
    return undefined;
  }
}

/** Normalizes a discovered href: strips hash + known tracking params, drops trailing slash. */
function normalizeUrl(href: string): string | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  u.hash = '';
  for (const p of TRACKING_PARAMS) u.searchParams.delete(p);
  let s = u.toString();
  if (s.endsWith('/') && u.pathname !== '/') s = s.slice(0, -1);
  return s;
}

function shouldSkipUrl(u: URL): boolean {
  const path = u.pathname.toLowerCase();
  const dot = path.lastIndexOf('.');
  if (dot === -1) return false;
  const ext = path.slice(dot + 1);
  return SKIP_EXTENSIONS.has(ext);
}

/** Enforces a minimum spacing between request starts (politeness delay), with jitter. */
class RateGate {
  private nextAt = 0;

  constructor(private readonly baseDelayMs: number) {}

  async wait(): Promise<void> {
    const now = Date.now();
    const jitter = this.baseDelayMs * (0.6 + Math.random() * 0.8);
    const runAt = Math.max(this.nextAt, now);
    this.nextAt = runAt + jitter;
    const delay = runAt - now;
    if (delay > 0) await sleep(delay);
  }
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  /** Crawls up to `maxPages` same-domain pages starting at `rootUrl` — concurrent, retrying, robots.txt-aware. */
  async crawl(rootUrl: string, maxPages: number, login?: LoginConfig | null): Promise<{ pages: CrawledPage[]; socialLinks: CompanyInfo['socialLinks'] }> {
    const origin = new URL(rootUrl).origin;
    const rootNormalized = normalizeUrl(rootUrl) ?? rootUrl;

    const robots = await this.fetchRobots(origin);
    if (robots && robots.isAllowed(rootNormalized, ROBOTS_UA_TOKEN) === false) {
      throw new Error(`robots.txt این سایت اجازه‌ی کرال کردن ${rootNormalized} را نمی‌دهد`);
    }

    const robotsDelaySec = robots?.getCrawlDelay(ROBOTS_UA_TOKEN);
    const baseDelayMs = robotsDelaySec ? Math.min(robotsDelaySec * 1000, MAX_DELAY_MS) : DEFAULT_DELAY_MS;
    const gate = new RateGate(baseDelayMs);

    const queued = new Set<string>([rootNormalized]);
    const queue: { url: string; depth: number }[] = [{ url: rootNormalized, depth: 0 }];

    // Seed extra starting points from sitemap.xml (if any) so pages beyond the
    // depth/link-graph the BFS would reach on its own are still in the running.
    for (const loc of await this.discoverSitemapUrls(origin, robots)) {
      const clean = normalizeUrl(loc);
      if (!clean || queued.has(clean)) continue;
      let u: URL;
      try { u = new URL(clean); } catch { continue; }
      if (u.origin !== origin || shouldSkipUrl(u)) continue;
      queued.add(clean);
      queue.push({ url: clean, depth: 1 });
      if (queue.length >= maxPages * 3) break;
    }

    const pages: CrawledPage[] = [];
    const socialLinksMap = new Map<string, string>();
    let consecutiveFailures = 0;
    let blockSignals = 0;
    let aborted = false;

    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'],
      proxy: resolveProxyFromEnv(),
    });

    try {
      const context = await browser.newContext({
        userAgent: pickRandom(USER_AGENTS),
        viewport: pickRandom(VIEWPORTS),
        locale: 'fa-IR',
        extraHTTPHeaders: { 'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7' },
      });

      // Block heavy, content-irrelevant resources — faster crawls, less bandwidth, fewer
      // requests that could trip resource-based rate limits on the target site.
      await context.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (type === 'image' || type === 'font' || type === 'media') return route.abort();
        return route.continue();
      });

      if (login) {
        await this.login(context, login);
      }

      const worker = async (): Promise<void> => {
        let idleTicks = 0;
        while (!aborted && pages.length < maxPages) {
          const next = queue.shift();
          if (!next) {
            if (++idleTicks > MAX_IDLE_TICKS) return;
            await sleep(IDLE_TICK_MS);
            continue;
          }
          idleTicks = 0;

          if (robots && robots.isAllowed(next.url, ROBOTS_UA_TOKEN) === false) continue;

          await gate.wait();

          const page = await context.newPage();
          try {
            let response: Awaited<ReturnType<typeof page.goto>> = null;
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
              try {
                // 'domcontentloaded' instead of 'networkidle': pages with recurring background
                // requests (analytics beacons, polling widgets, ads) never go network-idle and
                // would otherwise burn the full timeout on every attempt. We settle for a short,
                // non-blocking idle wait afterwards to let JS-rendered content finish painting.
                response = await page.goto(next.url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
                await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { /* best-effort settle */ });
                break;
              } catch (err) {
                if (attempt === MAX_RETRIES) throw err;
                await sleep(600 * 2 ** attempt * (0.7 + Math.random() * 0.6));
              }
            }

            const status = response?.status() ?? 0;
            if (status === 403 || status === 429) {
              blockSignals++;
              this.logger.warn(`[${status}] ${next.url}`);
            } else if (status >= 500) {
              throw new Error(`HTTP ${status}`);
            }

            const contentType = response?.headers()['content-type'] ?? '';
            const isHtml = !contentType || contentType.includes('text/html');
            const isUsablePage = status === 0 || status < 400;
            if (isHtml && isUsablePage) {
              const title = await page.title();
              const text: string = await page.evaluate(() => document.body?.innerText ?? '');
              if (text.trim().length > 0 && pages.length < maxPages) pages.push({ url: next.url, title, text });

              const hrefs: string[] = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href));
              for (const href of hrefs) {
                const clean = normalizeUrl(href);
                if (!clean) continue;
                let u: URL;
                try { u = new URL(clean); } catch { continue; }

                for (const [domain, platform] of Object.entries(SOCIAL_DOMAINS)) {
                  if (u.hostname.endsWith(domain) && !socialLinksMap.has(platform)) {
                    socialLinksMap.set(platform, u.href);
                  }
                }

                if (u.origin === origin && next.depth < MAX_DEPTH && !shouldSkipUrl(u) && !queued.has(clean)) {
                  queued.add(clean);
                  queue.push({ url: clean, depth: next.depth + 1 });
                }
              }
            }

            consecutiveFailures = 0;
          } catch (err: any) {
            consecutiveFailures++;
            this.logger.warn(`Failed to load ${next.url}: ${err.message}`);
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES || blockSignals >= MAX_BLOCK_SIGNALS) {
              aborted = true;
              this.logger.error(`Aborting crawl of ${origin}: too many consecutive failures/blocks — the site is likely blocking this crawler`);
            }
          } finally {
            await page.close();
          }
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

      if (aborted && pages.length === 0) {
        throw new Error('کرال متوقف شد: سایت درخواست‌ها را مسدود می‌کند (خطاهای مکرر 403/429 یا شکست پیاپی)');
      }
    } finally {
      await browser.close();
    }

    return { pages, socialLinks: [...socialLinksMap.entries()].map(([platform, url]) => ({ platform, url })) };
  }

  private async fetchRobots(origin: string): Promise<RobotsRules | null> {
    try {
      const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return null;
      const body = await res.text();
      return robotsParser(`${origin}/robots.txt`, body);
    } catch {
      return null;
    }
  }

  /** Best-effort sitemap.xml discovery (root sitemap + one level of sitemap-index nesting). */
  private async discoverSitemapUrls(origin: string, robots: RobotsRules | null): Promise<string[]> {
    const candidates = robots?.getSitemaps().length ? robots.getSitemaps() : [`${origin}/sitemap.xml`];
    const urls = new Set<string>();

    for (const sitemapUrl of candidates.slice(0, 3)) {
      try {
        const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const xml = await res.text();
        const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);

        for (const loc of locs) {
          if (loc.endsWith('.xml')) {
            try {
              const nested = await fetch(loc, { signal: AbortSignal.timeout(8000) });
              if (nested.ok) {
                const nxml = await nested.text();
                for (const m of nxml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) urls.add(m[1]);
              }
            } catch {
              // nested sitemap fetch failed — skip it, not fatal
            }
          } else {
            urls.add(loc);
          }
          if (urls.size >= 500) break;
        }
      } catch {
        // sitemap is optional — ignore and fall back to link-following BFS
      }
      if (urls.size > 0) break;
    }

    return [...urls];
  }

  /**
   * Fills and submits a login form in the given (shared) browser context before crawling —
   * the resulting session cookies stay attached to `context` for subsequent page loads.
   * Best-effort only: sites with CAPTCHA, OTP, or multi-step login won't work with this.
   */
  private async login(context: BrowserContext, login: LoginConfig): Promise<void> {
    const page = await context.newPage();
    try {
      await page.goto(login.loginUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { /* best-effort settle */ });

      const userSel = login.usernameSelector || DEFAULT_USERNAME_SELECTOR;
      const passSel = login.passwordSelector || DEFAULT_PASSWORD_SELECTOR;
      const submitSel = login.submitSelector || DEFAULT_SUBMIT_SELECTOR;

      await page.locator(userSel).first().fill(login.username, { timeout: 10000 });
      await page.locator(passSel).first().fill(login.password, { timeout: 10000 });

      await Promise.all([
        page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => { /* best-effort */ }),
        page.locator(submitSel).first().click({ timeout: 10000 }),
      ]);

      this.logger.log(`Logged in to ${new URL(login.loginUrl).hostname}`);
    } catch (err: any) {
      throw new Error(`Login failed at ${login.loginUrl}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  /** Best-effort heuristic extraction of contact info from crawled page text. */
  extractCompanyInfo(pages: CrawledPage[], socialLinks: CompanyInfo['socialLinks']): CompanyInfo {
    const combined = pages.map((p) => p.text).join('\n');

    const emails = [...new Set(combined.match(EMAIL_RE) ?? [])].slice(0, 10);
    const mobiles = combined.match(MOBILE_RE) ?? [];
    const landlines = combined.match(LANDLINE_RE) ?? [];
    const phones = [...new Set([...mobiles, ...landlines].map((p) => p.trim()))].slice(0, 10);

    const addresses: string[] = [];
    for (const rawLine of combined.split('\n')) {
      const line = rawLine.trim();
      if (ADDRESS_LINE_RE.test(line) && line.length > 5 && line.length < 300) {
        addresses.push(line.replace(ADDRESS_LINE_RE, '').trim());
        if (addresses.length >= 5) break;
      }
    }

    return { emails, phones, addresses, socialLinks };
  }
}
