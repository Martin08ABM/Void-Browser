import { app, WebContents } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export type UserScriptRisk = 'low' | 'medium' | 'high';

export interface UserScript {
  id: string;
  name: string;
  version: string;
  description: string;
  code: string;
  matches: string[];
  includes: string[];
  excludes: string[];
  runAt: 'document-start' | 'document-end' | 'document-idle';
  enabled: boolean;
  createdAt: number;
  risk: UserScriptRisk;
  grants: string[];
  requires: string[];
  connects: string[];
}

const USERSCRIPTS_FILE = path.join(app.getPath('userData'), 'userscripts.json');

let scriptsCache: UserScript[] | null = null;

function loadScripts(): UserScript[] {
  if (scriptsCache) return scriptsCache;
  try {
    if (fs.existsSync(USERSCRIPTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERSCRIPTS_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        scriptsCache = data as UserScript[];
        return scriptsCache;
      }
    }
  } catch (err) {
    console.error('[Userscripts] Failed to load:', err);
  }
  scriptsCache = [];
  return scriptsCache;
}

function saveScripts(scripts: UserScript[]): void {
  scriptsCache = scripts;
  try {
    fs.writeFileSync(USERSCRIPTS_FILE, JSON.stringify(scripts, null, 2));
  } catch (err) {
    console.error('[Userscripts] Failed to save:', err);
  }
}

export function listScripts(): UserScript[] {
  return loadScripts();
}

export function addScript(code: string): UserScript {
  const meta = parseMetadata(code);
  const risk = analyzeRisk(meta, code);
  const script: UserScript = {
    id: generateId(),
    name: meta.name || 'Untitled Script',
    version: meta.version || '1.0.0',
    description: meta.description || '',
    code,
    matches: meta.matches.length > 0 ? meta.matches : ['*://*/*'],
    includes: meta.includes,
    excludes: meta.excludes,
    runAt: meta.runAt,
    enabled: true,
    createdAt: Date.now(),
    risk,
    grants: meta.grants,
    requires: meta.requires,
    connects: meta.connects,
  };
  const scripts = loadScripts();
  scripts.push(script);
  saveScripts(scripts);
  return script;
}

export function removeScript(id: string): boolean {
  const scripts = loadScripts();
  const idx = scripts.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  scripts.splice(idx, 1);
  saveScripts(scripts);
  return true;
}

export function toggleScript(id: string, enabled: boolean): boolean {
  const scripts = loadScripts();
  const script = scripts.find((s) => s.id === id);
  if (!script) return false;
  script.enabled = enabled;
  saveScripts(scripts);
  return true;
}

export function injectScripts(webContents: WebContents, url: string, runAt: UserScript['runAt']): void {
  const scripts = loadScripts().filter((s) => s.enabled && s.runAt === runAt && matchUrl(url, s));
  if (scripts.length === 0) return;

  for (const script of scripts) {
    const wrapped = buildSecureWrapper(script, url);
    webContents
      .executeJavaScript(wrapped, false)
      .catch((err) => console.error(`[Userscripts] Injection failed for "${script.name}":`, err));
  }
}

// ─── Secure wrapper ───

function buildSecureWrapper(script: UserScript, url: string): string {
  // Serialize arrays for injection into the wrapper
  const connectsJson = JSON.stringify(script.connects || []);
  const grantsJson = JSON.stringify(script.grants || []);

  return `(() => {
    const scriptName = ${JSON.stringify(script.name)};
    const scriptRisk = ${JSON.stringify(script.risk)};
    const allowedConnects = ${connectsJson};
    const grants = ${grantsJson};
    const hasGrant = (g) => grants.includes(g);
    const currentUrl = ${JSON.stringify(url)};

    const __originalFetch = window.fetch;
    const __originalXHR = window.XMLHttpRequest;
    const __originalOpen = __originalXHR.prototype.open;
    const __originalSend = __originalXHR.prototype.send;

    const canConnect = (targetUrl) => {
      try {
        const u = new URL(targetUrl, currentUrl);
        const h = u.hostname;
        if (h === 'localhost' || h === '127.0.0.1') return true;
        for (const p of allowedConnects) {
          const rx = new RegExp('^' + p.replace(/\\./g, '\\\\.').replace(/\\*/g, '.*').replace(/\\?/g, '\\\\?') + '$');
          if (rx.test(h)) return true;
        }
        return false;
      } catch { return false; }
    };

    // Secure fetch wrapper
    window.fetch = function(input, init) {
      const target = typeof input === 'string' ? input : input.url;
      if (!canConnect(target)) {
        console.warn('[VoidShield] Userscript "' + scriptName + '" blocked fetch to:', target);
        return Promise.reject(new TypeError('Failed to fetch (blocked by userscript sandbox)'));
      }
      return __originalFetch.apply(this, arguments);
    };

    // Secure XHR wrapper
    __originalXHR.prototype.open = function(method, url, async, user, password) {
      this._vsUrl = url;
      return __originalOpen.call(this, method, url, async, user, password);
    };
    __originalXHR.prototype.send = function(body) {
      if (this._vsUrl && !canConnect(this._vsUrl)) {
        console.warn('[VoidShield] Userscript "' + scriptName + '" blocked XHR to:', this._vsUrl);
        return;
      }
      return __originalSend.call(this, body);
    };

    // Block eval/Function for high-risk scripts without explicit grant
    if (scriptRisk === 'high' && !hasGrant('unsafeWindow') && !grants.includes('none')) {
      window.eval = function() {
        console.warn('[VoidShield] Userscript "' + scriptName + '" blocked eval()');
        throw new EvalError('eval() is disabled in high-risk userscript sandbox');
      };
      window.Function = function() {
        console.warn('[VoidShield] Userscript "' + scriptName + '" blocked Function constructor');
        throw new EvalError('Function constructor is disabled in high-risk userscript sandbox');
      };
    }

    // Minimal GM_* APIs sandboxed
    const GM_info = { script: { name: scriptName, version: ${JSON.stringify(script.version)} } };
    const GM_setValue = hasGrant('GM_setValue') || hasGrant('GM.setValue')
      ? (k, v) => { try { localStorage.setItem('__us:' + scriptName + ':' + k, JSON.stringify(v)); } catch(e) {} }
      : undefined;
    const GM_getValue = hasGrant('GM_getValue') || hasGrant('GM.getValue')
      ? (k, d) => { try { const r = localStorage.getItem('__us:' + scriptName + ':' + k); return r === null ? d : JSON.parse(r); } catch(e) { return d; } }
      : undefined;
    const GM_addStyle = hasGrant('GM_addStyle') || hasGrant('GM.addStyle')
      ? (css) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); return s; }
      : undefined;
    const GM_xmlhttpRequest = hasGrant('GM_xmlhttpRequest') || hasGrant('GM.xmlHttpRequest')
      ? (details) => {
          if (details.url && !canConnect(details.url)) {
            console.warn('[VoidShield] Userscript "' + scriptName + '" blocked GM_xmlhttpRequest to:', details.url);
            if (details.onerror) details.onerror({ status: 0, statusText: 'Blocked by sandbox' });
            return;
          }
          const xhr = new __originalXHR();
          xhr.open(details.method || 'GET', details.url, true);
          if (details.headers) { for (const [hk, hv] of Object.entries(details.headers)) xhr.setRequestHeader(hk, hv); }
          xhr.onload = () => { if (details.onload) details.onload({ status: xhr.status, statusText: xhr.statusText, responseText: xhr.responseText, responseHeaders: xhr.getAllResponseHeaders() }); };
          xhr.onerror = () => { if (details.onerror) details.onerror({ status: xhr.status, statusText: xhr.statusText }); };
          xhr.send(details.data || null);
        }
      : undefined;

    // Inject user code in strict mode IIFE
    (function(){
      "use strict";
      ${script.code}
    }).call(window);
  })();`;
}

// ─── Metadata parsing ───

interface ParsedMetadata {
  name: string;
  version: string;
  description: string;
  matches: string[];
  includes: string[];
  excludes: string[];
  runAt: UserScript['runAt'];
  grants: string[];
  requires: string[];
  connects: string[];
}

function parseMetadata(code: string): ParsedMetadata {
  const result: ParsedMetadata = {
    name: '',
    version: '',
    description: '',
    matches: [],
    includes: [],
    excludes: [],
    runAt: 'document-end',
    grants: [],
    requires: [],
    connects: [],
  };

  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('//')) break;

    const extract = (key: string): string | null => {
      const m = trimmed.match(new RegExp(`^\\s*//\\s*@${key}\\s+(.+)$`));
      return m ? m[1].trim() : null;
    };

    const name = extract('name');
    if (name) result.name = name;

    const version = extract('version');
    if (version) result.version = version;

    const description = extract('description');
    if (description) result.description = description;

    const match = extract('match');
    if (match) result.matches.push(match);

    const include = extract('include');
    if (include) result.includes.push(include);

    const exclude = extract('exclude');
    if (exclude) result.excludes.push(exclude);

    const runAt = extract('run-at');
    if (runAt && (runAt === 'document-start' || runAt === 'document-end' || runAt === 'document-idle')) {
      result.runAt = runAt;
    }

    const grant = extract('grant');
    if (grant) result.grants.push(grant);

    const require = extract('require');
    if (require) result.requires.push(require);

    const connect = extract('connect');
    if (connect) result.connects.push(connect);
  }

  return result;
}

// ─── Risk analysis ───

function analyzeRisk(meta: ParsedMetadata, code: string): UserScriptRisk {
  const dangerousGrants = [
    'GM_xmlhttpRequest', 'GM.xmlHttpRequest',
    'GM_download', 'GM.download',
    'GM_openInTab', 'GM.openInTab',
    'GM_setClipboard', 'GM.setClipboard',
    'unsafeWindow',
  ];
  const mediumGrants = [
    'GM_setValue', 'GM.getValue', 'GM_setValue', 'GM_getValue',
    'GM_registerMenuCommand', 'GM.registerMenuCommand',
    'GM_notification', 'GM.notification',
  ];

  let score = 0;

  // External requirements (loading remote code)
  if (meta.requires.length > 0) score += 3;

  // Open network permissions
  if (meta.connects.includes('*')) score += 3;
  if (meta.connects.length > 0 && !meta.connects.includes('*')) score += 1;

  // Dangerous grants
  for (const g of meta.grants) {
    if (dangerousGrants.includes(g)) score += 2;
    if (mediumGrants.includes(g)) score += 1;
  }

  // Code heuristics
  if (/\beval\s*\(/.test(code)) score += 2;
  if (/new\s+Function\s*\(/.test(code)) score += 2;
  if (/document\.write\s*\(/.test(code)) score += 1;
  if (/localStorage\.clear\s*\(/.test(code)) score += 1;
  if (/fetch\s*\(/.test(code) && meta.connects.length === 0 && !meta.grants.some(g => g.includes('xmlhttpRequest'))) score += 1;

  // Broad match patterns
  const broadPatterns = meta.matches.filter((p) => p === '*://*/*' || p === '<all_urls>' || p === '*');
  if (broadPatterns.length > 0) score += 1;

  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

// ─── URL matching ───

function matchUrl(url: string, script: UserScript): boolean {
  // Excludes have priority
  if (script.excludes.some((p) => matchPattern(url, p))) return false;
  // Matches
  if (script.matches.some((p) => matchPattern(url, p))) return true;
  // Includes (legacy GM style)
  if (script.includes.some((p) => matchPattern(url, p))) return true;
  return false;
}

function matchPattern(url: string, pattern: string): boolean {
  try {
    let regexStr = pattern
      .replace(/\./g, '\\.')
      .replace(/\?/g, '\\?')
      .replace(/\*/g, '.*')
      .replace(/\+/, '\\+');
    regexStr = '^' + regexStr + '$';
    const regex = new RegExp(regexStr);
    return regex.test(url);
  } catch {
    return false;
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
