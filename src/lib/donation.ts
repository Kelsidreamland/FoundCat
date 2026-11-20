export type DonationLanguage = 'zh' | 'en';

export type DonationLink = {
  id: string;
  label: Record<DonationLanguage, string>;
  url: string;
};

export type CryptoDonation = {
  id: string;
  /** Coin or token symbol, e.g. "USDT". */
  label: string;
  /** Chain the address lives on, e.g. "TRON (TRC20)". */
  network: string;
  address: string;
};

export type DonationConfig = {
  links: DonationLink[];
  crypto: CryptoDonation[];
  hideCryptoForMainlandChina: boolean;
};

export type DonationOptions = {
  links: DonationLink[];
  crypto: CryptoDonation[];
};

export type VisitorLocale = {
  timeZone?: string;
  languages?: readonly string[];
};

const MAINLAND_TIME_ZONES = new Set(['Asia/Shanghai', 'Asia/Urumqi', 'Asia/Chongqing', 'Asia/Harbin', 'PRC']);

export function looksLikeMainlandChinaVisitor({ timeZone, languages = [] }: VisitorLocale): boolean {
  if (timeZone && MAINLAND_TIME_ZONES.has(timeZone)) {
    return true;
  }

  return languages.some((language) => /^zh-(cn|hans-cn|sg)$/i.test(language) || /^zh-hans$/i.test(language));
}

export function getVisitorLocale(): VisitorLocale {
  try {
    return {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      languages: typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language],
    };
  } catch {
    return {};
  }
}

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

export function resolveDonationOptions(config: DonationConfig, visitor: VisitorLocale): DonationOptions {
  const links = config.links.filter((link) => isHttpUrl(link.url));
  const hideCrypto = config.hideCryptoForMainlandChina && looksLikeMainlandChinaVisitor(visitor);
  const crypto = hideCrypto
    ? []
    : config.crypto
      .map((entry) => ({ ...entry, address: entry.address.trim() }))
      .filter((entry) => entry.address.length > 0);

  return { links, crypto };
}

export function hasDonationOptions(options: DonationOptions): boolean {
  return options.links.length > 0 || options.crypto.length > 0;
}
