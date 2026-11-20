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
    // EVM address (Binance Web3 Wallet): the same 0x address receives on every EVM chain.
    // Only list chains you have confirmed the wallet shows — tokens sent on an unsupported
    // chain may be unrecoverable.
    {
      id: 'evm',
      label: 'USDT・USDC・ETH・BNB',
      network: 'Ethereum (ERC20) / BNB Smart Chain (BEP20)',
      address: '0x9899b7FB95129E3451446F5998B8eded0A5069a3',
    },
    // Non-EVM chains use a different address format. Fill in to show them.
    { id: 'usdt-trc20', label: 'USDT', network: 'TRON (TRC20)', address: '' },
    { id: 'btc', label: 'BTC', network: 'Bitcoin', address: '' },
    { id: 'sol', label: 'SOL', network: 'Solana', address: '' },
  ],
  /**
   * When true, crypto options are hidden for visitors whose device looks mainland-China
   * based (time zone or language); card links still show. Off for now: the launch assumes
   * friends in China use a VPN. Turn on if the site is ever served inside mainland China.
   */
  hideCryptoForMainlandChina: false,
};
