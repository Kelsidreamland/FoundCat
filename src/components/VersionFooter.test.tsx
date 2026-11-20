import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VersionFooter, { CHECK_FOR_UPDATES_EVENT } from './VersionFooter';

describe('VersionFooter', () => {
  afterEach(() => cleanup());

  it('shows the app version in page flow and asks for an update check on tap', () => {
    const listener = vi.fn();
    window.addEventListener(CHECK_FOR_UPDATES_EVENT, listener);
    render(<VersionFooter language="zh" />);

    const button = screen.getByTestId('version-footer');
    expect(button).toHaveTextContent(/^v.+檢查更新$/);
    expect(button.closest('.fixed')).toBeNull();

    fireEvent.click(button);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(CHECK_FOR_UPDATES_EVENT, listener);
  });
});
