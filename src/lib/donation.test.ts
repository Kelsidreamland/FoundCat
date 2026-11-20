import { describe, expect, it } from 'vitest';
import { donationConfig } from '../config/donation';
import { hasDonationOptions, looksLikeMainlandChinaVisitor, resolveDonationOptions, type DonationConfig } from './donation';

const config: DonationConfig = {
  links: [
    { id: 'card', label: { zh: '信用卡', en: 'Card' }, url: 'https://example.com/pay' },
    { id: 'empty', label: { zh: '空', en: 'Empty' }, url: '' },
  ],
  crypto: [
    { id: 'usdt', label: 'USDT', network: 'TRON (TRC20)', address: '  TXYZ123  ' },
    { id: 'btc', label: 'BTC', network: 'Bitcoin', address: '' },
  ],
  hideCryptoForMainlandChina: true,
};

const taipei = { timeZone: 'Asia/Taipei', languages: ['zh-TW'] };

describe('donation options', () => {
  it('drops entries without a url or address and trims addresses', () => {
    const options = resolveDonationOptions(config, taipei);

    expect(options.links.map((link) => link.id)).toEqual(['card']);
    expect(options.crypto).toEqual([{ id: 'usdt', label: 'USDT', network: 'TRON (TRC20)', address: 'TXYZ123' }]);
  });

  it('hides crypto for mainland China visitors when configured', () => {
    const options = resolveDonationOptions(config, { timeZone: 'Asia/Shanghai', languages: ['zh-CN'] });

    expect(options.crypto).toEqual([]);
    expect(options.links).toHaveLength(1);
  });

  it('keeps crypto for mainland visitors when the switch is off', () => {
    const options = resolveDonationOptions({ ...config, hideCryptoForMainlandChina: false }, { timeZone: 'Asia/Shanghai' });

    expect(options.crypto).toHaveLength(1);
  });

  it('detects mainland visitors by time zone or simplified Chinese locale', () => {
    expect(looksLikeMainlandChinaVisitor({ timeZone: 'Asia/Shanghai' })).toBe(true);
    expect(looksLikeMainlandChinaVisitor({ timeZone: 'Europe/London', languages: ['zh-CN'] })).toBe(true);
    expect(looksLikeMainlandChinaVisitor(taipei)).toBe(false);
    expect(looksLikeMainlandChinaVisitor({ timeZone: 'Asia/Hong_Kong', languages: ['zh-HK'] })).toBe(false);
  });

  it('reports when nothing is configured so the donate button can hide', () => {
    expect(hasDonationOptions({ links: [], crypto: [] })).toBe(false);
    expect(hasDonationOptions(resolveDonationOptions(donationConfig, taipei))).toBe(true);
  });
});
