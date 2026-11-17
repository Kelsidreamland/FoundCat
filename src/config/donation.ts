/**
 * Donation settings.
 *
 * Every entry is optional: leave a value empty ('') and that option is hidden.
 * If nothing is filled in, the donate button disappears entirely.
 *
 * Crypto addresses are public by nature, so it is fine to commit them here.
 * Always fill in `network` — sending a token on the wrong chain loses the funds.
 */
import type { DonationConfig } from '../lib/donation';

export const donationConfig: DonationConfig = {
  links: [
    {
      id: 'payuni',
      label: { zh: '信用卡／台灣支付', en: 'Card (PAYUNi, Taiwan)' },
      url: 'https://api.payuni.com.tw/api/uop/receive_info/2/3/NPPA226028039/mgYrU0DqoPbb6vatwL86Z',
    },
  ],
  crypto: [
    // Fill in `address` to show the option. Examples of the shape:
    { id: 'usdt-trc20', label: 'USDT', network: 'TRON (TRC20)', address: '' },
    { id: 'usdt-erc20', label: 'USDT', network: 'Ethereum (ERC20)', address: '' },
    { id: 'eth', label: 'ETH', network: 'Ethereum', address: '' },
    { id: 'btc', label: 'BTC', network: 'Bitcoin', address: '' },
    { id: 'sol', label: 'SOL', network: 'Solana', address: '' },
  ],
  /**
   * Crypto transactions are banned in mainland China, and crypto content can get a
   * domain flagged there. When true, crypto options are hidden for visitors whose
   * device looks mainland-based (time zone or language). Card links still show.
   */
  hideCryptoForMainlandChina: true,
};
