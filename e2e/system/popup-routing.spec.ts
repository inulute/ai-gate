import { test, expect } from '@playwright/test';
import { getProviderPopupRoute } from '../../electron/popupRouting';

test('opens ordinary provider links in the external browser', () => {
  expect(getProviderPopupRoute('https://support.google.com/chrome/answer/95346')).toBe('external');
  expect(getProviderPopupRoute('https://example.com/articles/oauth-explained')).toBe('external');
});

test('keeps recognized sign-in popups inside AI Gate', () => {
  const signInUrls = [
    'https://accounts.google.com/o/oauth2/v2/auth?client_id=example',
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=example',
    'https://github.com/login/oauth/authorize?client_id=example',
    'https://appleid.apple.com/auth/authorize?client_id=example',
    'https://auth.example.com/session/start',
    'https://example.com/api/auth/signin/provider',
  ];

  for (const url of signInUrls) {
    expect(getProviderPopupRoute(url)).toBe('in-app');
  }
});

test('uses the OS handler for mail and denies unsupported popup schemes', () => {
  expect(getProviderPopupRoute('mailto:help@example.com')).toBe('external');
  expect(getProviderPopupRoute('javascript:alert(document.domain)')).toBe('deny');
});
