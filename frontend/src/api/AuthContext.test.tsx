import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="authenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="token-preview">
        {auth.token ? `${auth.token.slice(0, 4)}...` : 'no-token'}
      </div>
      <button data-testid="login-btn" onClick={() => auth.login('test-token-12345')}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={auth.logout}>
        Logout
      </button>
    </div>
  );
}

function wrap(ui: React.ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('initial state', () => {
    it('starts as not authenticated when no token in sessionStorage', () => {
      wrap(<TestConsumer />);
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('token-preview')).toHaveTextContent('no-token');
    });

    it('restores token from sessionStorage if present', () => {
      sessionStorage.setItem('mediamtxAdminToken', 'restored-token-abc');
      wrap(<TestConsumer />);
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('token-preview')).toHaveTextContent('rest...');
    });
  });

  describe('login', () => {
    it('sets isAuthenticated to true after login', () => {
      wrap(<TestConsumer />);
      act(() => screen.getByTestId('login-btn').click());
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    it('stores token in sessionStorage after login', () => {
      wrap(<TestConsumer />);
      act(() => screen.getByTestId('login-btn').click());
      expect(sessionStorage.getItem('mediamtxAdminToken')).toBe('test-token-12345');
    });

    it('shows token preview after login', () => {
      wrap(<TestConsumer />);
      act(() => screen.getByTestId('login-btn').click());
      expect(screen.getByTestId('token-preview')).toHaveTextContent('test...');
    });
  });

  describe('logout', () => {
    it('sets isAuthenticated to false after logout', () => {
      wrap(<TestConsumer />);
      act(() => screen.getByTestId('login-btn').click());
      act(() => screen.getByTestId('logout-btn').click());
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });

    it('removes token from sessionStorage after logout', () => {
      wrap(<TestConsumer />);
      act(() => screen.getByTestId('login-btn').click());
      act(() => screen.getByTestId('logout-btn').click());
      expect(sessionStorage.getItem('mediamtxAdminToken')).toBeNull();
    });
  });

  describe('useAuth throws outside provider', () => {
    it('throws error when used outside AuthProvider', () => {
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within an AuthProvider',
      );
    });
  });

  describe('401 unauthorized handling', () => {
    beforeEach(() => {
      // Log in first
      sessionStorage.setItem('mediamtxAdminToken', 'valid-token');
    });

    afterEach(() => {
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: '' }));
    });

    it('restores authenticated state from sessionStorage', () => {
      wrap(<TestConsumer />);
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    it('clears token when auth:unauthorized event fires', () => {
      wrap(<TestConsumer />);
      act(() => {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: 'Token inválido o caducado' }));
      });
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('token-preview')).toHaveTextContent('no-token');
    });

    it('removes token from sessionStorage when auth:unauthorized fires', () => {
      wrap(<TestConsumer />);
      act(() => {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: 'Token inválido o caducado' }));
      });
      expect(sessionStorage.getItem('mediamtxAdminToken')).toBeNull();
    });
  });
});
