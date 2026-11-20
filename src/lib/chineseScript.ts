import type { ChineseScript } from '../store/useScrapbookStore';

type Convert = (text: string) => string;

let converterPromise: Promise<Convert> | null = null;

/** Traditional (Taiwan) to Simplified (Mainland) converter, loaded only when needed (~110 KB). */
export const loadSimplifiedConverter = () => {
  converterPromise ??= import('opencc-js/t2cn').then(({ Converter }) => Converter({ from: 'tw', to: 'cn' }));
  return converterPromise;
};

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT']);
const CONVERTED_ATTRIBUTES = ['placeholder', 'aria-label', 'title', 'alt'] as const;
const HAN = /[㐀-鿿]/;

const shouldSkip = (element: Element | null) => {
  for (let current = element; current; current = current.parentElement) {
    if (SKIP_TAGS.has(current.tagName) || current.hasAttribute('data-no-script-convert')) return true;
  }
  return false;
};

const convertTextNode = (node: Text, convert: Convert) => {
  const value = node.nodeValue;
  if (!value || !HAN.test(value) || shouldSkip(node.parentElement)) return;
  const converted = convert(value);
  if (converted !== value) node.nodeValue = converted;
};

const convertAttributes = (element: Element, convert: Convert) => {
  if (shouldSkip(element)) return;
  for (const name of CONVERTED_ATTRIBUTES) {
    const value = element.getAttribute(name);
    if (value && HAN.test(value)) {
      const converted = convert(value);
      if (converted !== value) element.setAttribute(name, converted);
    }
  }
};

export const convertTree = (root: Node, convert: Convert) => {
  if (root.nodeType === Node.TEXT_NODE) {
    convertTextNode(root as Text, convert);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  convertAttributes(root as Element, convert);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) convertTextNode(node as Text, convert);
    else convertAttributes(node as Element, convert);
  }
};

/**
 * Keep everything under `root` in Simplified Chinese, including text React renders later.
 * Returns a function that stops watching.
 */
export const watchAndConvert = (root: Element, convert: Convert) => {
  convertTree(root, convert);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') convertTextNode(record.target as Text, convert);
      else if (record.type === 'attributes') convertAttributes(record.target as Element, convert);
      else record.addedNodes.forEach((node) => convertTree(node, convert));
    }
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...CONVERTED_ATTRIBUTES],
  });
  return () => observer.disconnect();
};

export type DisplayLanguage = 'zh-hant' | 'en' | 'zh-hans';

export const getDisplayLanguage = (language: 'zh' | 'en', script: ChineseScript): DisplayLanguage => (
  language === 'en' ? 'en' : script === 'hans' ? 'zh-hans' : 'zh-hant'
);

/** 繁 → EN → 简 → 繁. English stays one tap away for the Traditional default. */
export const NEXT_DISPLAY_LANGUAGE: Record<DisplayLanguage, DisplayLanguage> = {
  'zh-hant': 'en',
  en: 'zh-hans',
  'zh-hans': 'zh-hant',
};

export const DISPLAY_LANGUAGE_TOGGLE: Record<DisplayLanguage, { face: string; label: string }> = {
  // Keyed by the language the button switches TO.
  en: { face: 'EN', label: 'Switch to English' },
  'zh-hans': { face: '简', label: '切换为简体中文' },
  'zh-hant': { face: '繁', label: '切換為繁體中文' },
};
