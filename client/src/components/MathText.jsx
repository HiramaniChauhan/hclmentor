/**
 * MathText Component
 * ==================
 * Renders markdown + LaTeX math from AI responses.
 *
 * Props:
 *   text     — the string to render
 *   inline   — if true, renders as inline <span> using md.renderInline()
 *              (safe to use inside <button>, <p>, <span> etc.)
 *   className — extra CSS class on the root element
 *
 * Pipeline (block mode):
 *   0. stripKatexHtml   — removes any raw KaTeX HTML the AI emitted
 *   1. fixMathDelimiters — normalise [ ] / ( ) non-standard delimiters
 *   2. katexPrerender    — single-pass: renders ALL $...$ math to KaTeX HTML
 *   3. markdown-it       — converts markdown to HTML (KaTeX spans pass through)
 *   4. dangerouslySetInnerHTML — renders final HTML in React
 */

import { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import katex from 'katex';

// markdown-it instance — html:true lets our pre-rendered KaTeX HTML pass through
const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: false,
});

// ── Step 0: Strip any pre-rendered KaTeX HTML the AI mistakenly outputs ───────
// The AI sometimes returns <span class="katex">…</span> blocks (fully-rendered
// KaTeX HTML) immediately followed by a plain-text duplicate, e.g.:
//   <span class="katex"><span class="katex-html">…nested…</span></span>3x
// We use a real DOM element (not regex) so arbitrary nesting is handled.
// After removing the katex elements, textContent gives only the plain-text
// parts (the "3x" OUTSIDE the span) — which is exactly what we want.
function stripKatexHtml(text) {
    if (!text.includes('<') && !text.includes('&lt;')) return text; // fast path

    try {
        const tmp = document.createElement('div');
        // Unescape HTML entities so <span> tags are real DOM elements
        tmp.innerHTML = text
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');

        // <br> → newline
        Array.from(tmp.querySelectorAll('br')).forEach((br) =>
            br.parentNode?.replaceChild(document.createTextNode('\n'), br)
        );

        // Replace katex-rendered elements with their plain-text content.
        // Using replaceWith(textContent) so the parent text flows naturally.
        Array.from(tmp.querySelectorAll('[class*="katex"]')).forEach((el) => {
            el.replaceWith(document.createTextNode(el.textContent ?? ''));
        });

        const clean = (tmp.textContent ?? '').replace(/\n{3,}/g, '\n\n');
        return clean.trim() ? clean : fallbackStripTags(text);
    } catch (_) {
        return fallbackStripTags(text);
    }
}

// Regex fallback — strips ALL HTML tags when DOM approach fails
function fallbackStripTags(text) {
    return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n');
}

// ── Step 1: Normalise non-standard AI delimiters ──────────────────────────────
function fixMathDelimiters(text) {
    // [ expr ] → $$expr$$ (block), skip markdown links [label](url)
    text = text.replace(/\[([^\[\]\n]{2,200})\](?!\()/g, (match, inner) => {
        const t = inner.trim();
        if (/[\\^_]|[a-zA-Z]\s*[+\-*/^]\s*[a-zA-Z0-9]|[a-zA-Z]\s*=\s*-?[\d]/.test(t)) {
            return `$$${t}$$`;
        }
        return match;
    });

    // ( expr ) → $expr$ only when it has clear LaTeX markers (\ or ^)
    text = text.replace(/\(([^()\n]{1,80})\)/g, (match, inner) => {
        const t = inner.trim();
        if (/[\\^]/.test(t) && t.length > 2) {
            return `$${t}$`;
        }
        return match;
    });

    return text;
}

// ── Step 2: Safe KaTeX renderer ───────────────────────────────────────────────
function safeKatex(rawMath, displayMode) {
    const math = rawMath.trim().replace(/\\+$/, '').trim();
    if (!math) return '';

    try {
        return katex.renderToString(math, {
            displayMode,
            throwOnError: true,
            strict: false,
            trust: false,
        });
    } catch {
        const safe = math.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return displayMode
            ? `<div class="math-plain">${safe}</div>`
            : `<span class="math-plain">${safe}</span>`;
    }
}

// ── Step 3: Single-pass KaTeX pre-render ─────────────────────────────────────
const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]{1,400}?\$|\\\([\s\S]+?\\\))/g;

function katexPrerender(text) {
    const rendered = [];

    const withPlaceholders = text.replace(MATH_PATTERN, (match) => {
        const ph = `\x00M${rendered.length}\x00`;
        let html;

        if (match.startsWith('$$')) {
            html = `<div class="math-block">${safeKatex(match.slice(2, -2), true)}</div>`;
        } else if (match.startsWith('\\[')) {
            html = `<div class="math-block">${safeKatex(match.slice(2, -2), true)}</div>`;
        } else if (match.startsWith('\\(')) {
            html = safeKatex(match.slice(2, -2), false);
        } else {
            html = safeKatex(match.slice(1, -1), false);
        }

        rendered.push({ ph, html });
        return ph;
    });

    let result = withPlaceholders;
    for (const { ph, html } of rendered) {
        result = result.replace(ph, html);
    }
    return result;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MathText({ text, inline = false, className = '' }) {
    if (!text) return null;

    const html = useMemo(() => {
        const step0 = stripKatexHtml(String(text));
        const step1 = fixMathDelimiters(step0);
        const step2 = katexPrerender(step1);
        return inline ? md.renderInline(step2) : md.render(step2);
    }, [text, inline]);

    if (inline) {
        return (
            <span
                className={`math-text-inline ${className}`}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    }

    return (
        <div
            className={`math-text ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
