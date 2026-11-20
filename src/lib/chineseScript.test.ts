import { afterEach, describe, expect, it } from 'vitest';
import { convertTree, DISPLAY_LANGUAGE_TOGGLE, getDisplayLanguage, loadSimplifiedConverter, NEXT_DISPLAY_LANGUAGE, watchAndConvert } from './chineseScript';

describe('Simplified Chinese conversion', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('converts Taiwan Traditional UI copy to Simplified', async () => {
    const convert = await loadSimplifiedConverter();
    expect(convert('轉角遇到貓，我的貓卡')).toBe('转角遇到猫，我的猫卡');
    expect(convert('拍下牠，牠們都在')).toBe('拍下它，它们都在');
  });

  it('converts text and accessible labels but leaves inputs and opted-out nodes alone', async () => {
    const convert = await loadSimplifiedConverter();
    document.body.innerHTML = `
      <p id="text">貓咪地圖</p>
      <button id="btn" aria-label="關閉說明">×</button>
      <textarea id="ta">貓咪備註</textarea>
      <span id="keep" data-no-script-convert>繁</span>`;
    convertTree(document.body, convert);
    expect(document.getElementById('text')!.textContent).toBe('猫咪地图');
    expect(document.getElementById('btn')!.getAttribute('aria-label')).toBe('关闭说明');
    expect(document.getElementById('ta')!.textContent).toBe('貓咪備註');
    expect(document.getElementById('keep')!.textContent).toBe('繁');
  });

  it('keeps converting text rendered later', async () => {
    const convert = await loadSimplifiedConverter();
    const stop = watchAndConvert(document.body, convert);
    const p = document.createElement('p');
    p.textContent = '已收藏到我的貓卡';
    document.body.appendChild(p);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(p.textContent).toBe('已收藏到我的猫卡');
    p.firstChild!.nodeValue = '世界地圖';
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(p.textContent).toBe('世界地图');
    stop();
  });

  it('cycles 繁 → EN → 简 → 繁', () => {
    expect(getDisplayLanguage('zh', 'hant')).toBe('zh-hant');
    expect(NEXT_DISPLAY_LANGUAGE['zh-hant']).toBe('en');
    expect(NEXT_DISPLAY_LANGUAGE.en).toBe('zh-hans');
    expect(NEXT_DISPLAY_LANGUAGE['zh-hans']).toBe('zh-hant');
    expect(DISPLAY_LANGUAGE_TOGGLE.en.label).toBe('Switch to English');
  });
});
