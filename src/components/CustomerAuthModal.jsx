import React, { useState } from 'react';
import { LockKeyhole, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './CustomerAuthModal.css';

const getAuthErrorMessage = (error) => {
  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account already uses this email. Sign in instead.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Use a password with at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network issue. Check your connection and try again.';
    default:
      return 'Could not authenticate. Please try again.';
  }
};

export default function CustomerAuthModal({ onClose }) {
  const { signIn, signUp } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const cleanPhone = phone.replace(/\D/g, '');
    if (mode === 'signup' && !name.trim()) {
      setError('Enter your name to create an account.');
      return;
    }
    if (mode === 'signup' && cleanPhone.length !== 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp({ email: email.trim(), password, name: name.trim(), phone: cleanPhone });
        toast.success('Account created', 'You are signed in. Confirm your booking to continue.');
      } else {
        await signIn(email.trim(), password);
        toast.success('Signed in', 'Confirm your booking to continue.');
      }
      onClose();
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <div className="customer-auth-overlay" onClick={onClose}>
      <section
        className="customer-auth-card glass-strong"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-auth-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="customer-auth-close"
          onClick={onClose}
          aria-label="Close sign-in dialog"
        >
          <X size={20} />
        </button>
        <div className="customer-auth-icon"><LockKeyhole size={22} /></div>
        <h2 id="customer-auth-title">{isSignup ? 'Create your account' : 'Sign in to book'}</h2>
        <p className="customer-auth-copy">
          Sign in or create an account to reserve your gaming session.
        </p>

        <form className="customer-auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <label>
                Name
                <input
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label>
                Mobile number
                <input
                  autoComplete="tel"
                  inputMode="numeric"
                  type="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="10-digit mobile number"
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
            />
          </label>
          <label>
            Password
            <input
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              type="password"
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isSignup ? 'At least 6 characters' : 'Password'}
            />
          </label>

          {error && <p className="customer-auth-error" role="alert">{error}</p>}

          <button className="btn btn-primary customer-auth-submit" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="customer-auth-switch">
          {isSignup ? 'Already have an account?' : 'New to TS Gaming Cafe?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? 'signin' : 'signup');
              setError('');
            }}
          >
            {isSignup ? 'Sign in' : 'Create account'}
          </button>
        </p>
      </section>
    </div>
  );
}
