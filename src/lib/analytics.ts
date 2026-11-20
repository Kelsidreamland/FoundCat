import type { BeforeSendEvent } from '@vercel/analytics/react';

/**
 * Only the page path is reported. Query strings and hashes are dropped because share
 * links carry cat details there and map links carry cat ids.
 */
export const stripUrlDetails = (event: BeforeSendEvent): BeforeSendEvent => {
  try {
    const url = new URL(event.url);
    return { ...event, url: `${url.origin}${url.pathname}` };
  } catch {
    return event;
  }
};
