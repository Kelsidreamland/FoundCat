import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DonationSheet from './DonationSheet';

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn(async () => 'data:image/png;base64,qr') },
}));

const options = {
  links: [{ id: 'card', label: { zh: '信用卡', en: 'Card' }, url: 'https://example.com/pay' }],
  crypto: [{ id: 'usdt-trc20', label: 'USDT', network: 'TRON (TRC20)', address: 'TXYZ123' }],
};

describe('DonationSheet', () => {
  afterEach(() => cleanup());

  it('lists payment links and crypto addresses with a QR code and network', async () => {
    render(<DonationSheet language="zh" options={options} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: '請貓咪喝罐罐' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '信用卡' })).toHaveAttribute('href', 'https://example.com/pay');
    expect(screen.getByTestId('crypto-address-usdt-trc20')).toHaveTextContent('TXYZ123');
    expect(screen.getByText('網路: TRON (TRC20)')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'USDT TRON (TRC20) 收款 QR Code' })).toHaveAttribute('src', 'data:image/png;base64,qr');
  });

  it('copies the address and closes on request', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<DonationSheet language="en" options={options} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Copy address' }));
    expect(writeText).toHaveBeenCalledWith('TXYZ123');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
