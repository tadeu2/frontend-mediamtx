import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Login } from './Login';

const mockLogin = vi.fn();
let mockAuthError: string | null = null;

vi.mock('../api/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    token: null,
    logout: vi.fn(),
    authError: mockAuthError,
  }),
}));

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthError = null;
  });

  it('renders token input and submit button', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('Paste your admin token…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /authenticate/i })).toBeInTheDocument();
  });

  it('shows instruction text', () => {
    render(<Login />);
    expect(screen.getByText(/admin authentication required/i)).toBeInTheDocument();
  });

  it('calls login with the entered token on submit', () => {
    render(<Login />);

    const input = screen.getByPlaceholderText('Paste your admin token…');
    fireEvent.change(input, { target: { value: 'my-secret-token' } });

    const button = screen.getByRole('button', { name: /authenticate/i });
    fireEvent.click(button);

    expect(mockLogin).toHaveBeenCalledWith('my-secret-token');
  });

  it('does not call login with empty input', () => {
    render(<Login />);

    const button = screen.getByRole('button', { name: /authenticate/i });
    fireEvent.click(button);

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('does not show the token value in the input field type', () => {
    render(<Login />);
    const input = screen.getByPlaceholderText('Paste your admin token…');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('displays error message when authError is set', () => {
    mockAuthError = 'Token inválido o caducado';
    render(<Login />);
    expect(screen.getByText(/Token inválido o caducado/)).toBeInTheDocument();
  });
});
