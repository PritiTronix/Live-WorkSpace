import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiUrl, getApiOrigin, getApiBaseUrl, getInitials } from './apiUrl.js';

test('Falsy and non-string inputs are returned unchanged', () => {
  assert.equal(resolveApiUrl(null), null);
  assert.equal(resolveApiUrl(undefined), undefined);
  assert.equal(resolveApiUrl(''), '');
  assert.equal(resolveApiUrl(123), 123);
});

test('Already absolute URLs (http, https) are returned unchanged', () => {
  assert.equal(
    resolveApiUrl('https://example.com/avatar.jpg'),
    'https://example.com/avatar.jpg'
  );
  assert.equal(
    resolveApiUrl('http://insecure.internal/logo.png'),
    'http://insecure.internal/logo.png'
  );
  assert.equal(
    resolveApiUrl('https://lh3.googleusercontent.com/aida-public/test.jpg'),
    'https://lh3.googleusercontent.com/aida-public/test.jpg'
  );
});

test('Special pseudo-protocols (blob, data) are returned unchanged', () => {
  assert.equal(
    resolveApiUrl('blob:http://localhost:5173/uuid-1234'),
    'blob:http://localhost:5173/uuid-1234'
  );
  assert.equal(
    resolveApiUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'),
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
  );
});

test('Relative avatar URL is prefixed with the origin of VITE_API_BASE_URL', () => {
  const origEnv = process.env.VITE_API_BASE_URL;
  try {
    process.env.VITE_API_BASE_URL = 'https://api.workspacesaas.live/api/v1';

    const avatarPath = '/api/v1/users/usr_482910/avatar?sig=a1b2c3d4e5f6&v=1732200000';
    const resolved = resolveApiUrl(avatarPath);
    assert.equal(
      resolved,
      'https://api.workspacesaas.live/api/v1/users/usr_482910/avatar?sig=a1b2c3d4e5f6&v=1732200000'
    );
  } finally {
    process.env.VITE_API_BASE_URL = origEnv;
  }
});

test('Relative file download and ticket attachment URLs are prefixed correctly', () => {
  const origEnv = process.env.VITE_API_BASE_URL;
  try {
    process.env.VITE_API_BASE_URL = 'https://api.workspacesaas.live/api/v1';

    const filePath = '/api/v1/files/f_99210/download';
    assert.equal(
      resolveApiUrl(filePath),
      'https://api.workspacesaas.live/api/v1/files/f_99210/download'
    );

    const ticketAttPath = '/api/v1/tickets/t_12345/attachments/att_67890/download';
    assert.equal(
      resolveApiUrl(ticketAttPath),
      'https://api.workspacesaas.live/api/v1/tickets/t_12345/attachments/att_67890/download'
    );

    const orgLogoPath = '/uploads/logos/org_techcorp.png';
    assert.equal(
      resolveApiUrl(orgLogoPath),
      'https://api.workspacesaas.live/uploads/logos/org_techcorp.png'
    );
  } finally {
    process.env.VITE_API_BASE_URL = origEnv;
  }
});

test('Path without leading slash is normalized cleanly without double slash', () => {
  const origEnv = process.env.VITE_API_BASE_URL;
  try {
    process.env.VITE_API_BASE_URL = 'https://api.workspacesaas.live/api/v1';

    const relativeNoSlash = 'api/v1/users/usr_test/avatar';
    assert.equal(
      resolveApiUrl(relativeNoSlash),
      'https://api.workspacesaas.live/api/v1/users/usr_test/avatar'
    );
  } finally {
    process.env.VITE_API_BASE_URL = origEnv;
  }
});

test('Origin is extracted even if base URL has custom port or no path', () => {
  const origEnv = process.env.VITE_API_BASE_URL;
  try {
    process.env.VITE_API_BASE_URL = 'http://127.0.0.1:8080';
    assert.equal(
      resolveApiUrl('/api/v1/users/me/avatar'),
      'http://127.0.0.1:8080/api/v1/users/me/avatar'
    );
  } finally {
    process.env.VITE_API_BASE_URL = origEnv;
  }
});

test('Shared Avatar getInitials fallback behavior', () => {
  assert.equal(getInitials('Bhavesh Burad'), 'BB');
  assert.equal(getInitials('Alex Rivera'), 'AR');
  assert.equal(getInitials('Sarah Connor'), 'SC');
  assert.equal(getInitials('David'), 'DA');
  assert.equal(getInitials(''), 'U');
  assert.equal(getInitials(null), 'U');
  assert.equal(getInitials(undefined), 'U');
  assert.equal(getInitials('   '), 'U');
});
