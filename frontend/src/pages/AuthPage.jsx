import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import StoreLayout from '../components/StoreLayout.jsx';
import { useStore } from '../context/StoreContext.jsx';
import api, { getErrorMessage } from '../services/api.js';
import './AuthPage.css';

const PAGE_TITLES = {
  login: 'WELCOME BACK.',
  register: 'JOIN THE ZONE.',
  forgot: 'RESET PASSWORD.',
};

export default function AuthPage({ mode }) {
  const { signIn, saveSession } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', otp: '' });
  const [step, setStep] = useState('main'); // 'main' | 'verify_email' | 'reset_otp' | 'reset_password'
  const [pendingEmail, setPendingEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState(location.state?.message ? '' : '');
  const [message, setMessage] = useState(location.state?.message || '');
  const [busy, setBusy] = useState(false);

  function field(e) {
    setForm((c) => ({ ...c, [e.target.name]: e.target.value }));
  }

  function startCooldown(seconds = 60) {
    setCooldown(Math.max(1, Number(seconds) || 60));
  }

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resendOtp() {
    if (cooldown > 0 || busy) return;
    setBusy(true); setError('');
    try {
      const endpoint = step === 'verify_email' ? '/auth/send-verify-otp' : '/auth/forgot-password';
      const { data } = await api.post(endpoint, { email: pendingEmail });
      setMessage('A new code has been sent to your email.');
      startCooldown();
    } catch (err) {
      setError(getErrorMessage(err));
      if (err.response?.data?.retryAfter) startCooldown(err.response.data.retryAfter);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError(''); setMessage('');

    // ── OTP verification step ──────────────────────────────────────────────
    if (step === 'verify_email') {
      setBusy(true);
      try {
        const { data } = await api.post('/auth/verify-email', { email: pendingEmail, otp: form.otp.trim() });
        saveSession(data);
        const dest = data.user.role === 'admin' ? '/admin' : (location.state?.from?.pathname || '/');
        navigate(dest, { replace: true });
      } catch (err) { setError(getErrorMessage(err)); }
      finally { setBusy(false); }
      return;
    }

    if (step === 'reset_otp') {
      setBusy(true);
      try {
        const { data } = await api.post('/auth/verify-reset-otp', { email: pendingEmail, otp: form.otp.trim() });
        if (!data.resetToken) throw new Error('The server did not issue reset authorization. Request a new code.');
        setResetToken(data.resetToken);
        setStep('reset_password');
        setMessage('Code verified. Enter your new password below.');
        setForm((c) => ({ ...c, otp: '', password: '', confirmPassword: '' }));
      } catch (err) { setError(getErrorMessage(err)); }
      finally { setBusy(false); }
      return;
    }

    if (step === 'reset_password') {
      if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
      setBusy(true);
      try {
        const { data } = await api.post('/auth/reset-password', {
          email: pendingEmail,
          resetToken,
          password: form.password,
        });
        navigate('/login', { replace: true, state: { message: data.message } });
      } catch (err) { setError(getErrorMessage(err)); }
      finally { setBusy(false); }
      return;
    }

    // ── Main form steps ────────────────────────────────────────────────────
    if (mode === 'register' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.'); return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        try {
          const user = await signIn({ email: form.email, password: form.password });
          const requested = location.state?.from?.pathname || '/';
          const dest = user.role === 'admin'
            ? (requested.startsWith('/admin') ? requested : '/admin')
            : (requested.startsWith('/admin') ? '/' : requested);
          navigate(dest, { replace: true });
        } catch (err) {
          if (err.response?.data?.requiresVerification) {
            const email = err.response.data.email;
            setPendingEmail(email);
            setStep('verify_email');
            const { data } = await api.post('/auth/send-verify-otp', { email });
            setMessage('Your email is not verified. Enter the 6-digit code sent to your inbox.');
            startCooldown();
          } else {
            setError(getErrorMessage(err));
          }
        }
      } else if (mode === 'register') {
        const { data } = await api.post('/auth/register', {
          name: form.name, email: form.email, password: form.password, phone: form.phone,
        });
        setPendingEmail(data.email);
        setStep('verify_email');
        setMessage(data.message);
        startCooldown();
      } else if (mode === 'forgot') {
        const { data } = await api.post('/auth/forgot-password', { email: form.email });
        setPendingEmail(form.email.trim().toLowerCase());
        setStep('reset_otp');
        setMessage(data.message);
        startCooldown();
      }
    } catch (err) {
      const registration = err.response?.data;
      if (mode === 'register' && registration?.registrationPending) {
        setPendingEmail(registration.email);
        setStep('verify_email');
        setMessage(registration.message);
        startCooldown(registration.retryAfter);
        return;
      }
      if (registration?.retryAfter) startCooldown(registration.retryAfter);
      setError(getErrorMessage(err, 'The request could not be completed. Check that the backend is running.'));
    } finally {
      setBusy(false);
    }
  }

  const isOtpEntry = step === 'verify_email' || step === 'reset_otp';
  const isNewPassword = step === 'reset_password';

  const heading = {
    verify_email: 'VERIFY EMAIL.',
    reset_otp: 'ENTER CODE.',
    reset_password: 'NEW PASSWORD.',
    main: PAGE_TITLES[mode] || 'GYMZONE.',
  }[step];

  return (
    <StoreLayout>
      <main className="auth-page content-width">
        <section className="auth-panel">
          <p className="section-eyebrow">GYMZONE ACCOUNT</p>
          <h1>{heading}</h1>
          <p className="auth-intro">
            {isOtpEntry && `Enter the 6-digit code sent to ${pendingEmail}.`}
            {isNewPassword && 'Choose a new password for your account.'}
            {step === 'main' && mode === 'login' && 'Sign in to manage your bag and orders.'}
            {step === 'main' && mode === 'register' && 'Create an account to check out and track your orders.'}
            {step === 'main' && mode === 'forgot' && 'Enter the email address used for your account.'}
          </p>

          <form className="auth-form" onSubmit={submit}>
            {step === 'main' && mode === 'register' && (
              <>
                <label>FULL NAME
                  <input name="name" autoComplete="name" value={form.name} onChange={field} required minLength="2" />
                </label>
                <label>PHONE NUMBER
                  <input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={field} placeholder="Optional" />
                </label>
              </>
            )}
            {step === 'main' && (mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <label>EMAIL ADDRESS
                <input name="email" type="email" autoComplete="email" value={form.email} onChange={field} required />
              </label>
            )}
            {step === 'main' && (mode === 'login' || mode === 'register') && (
              <label>{mode === 'login' ? 'PASSWORD' : 'CREATE PASSWORD'}
                <input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={field} required minLength="8" />
              </label>
            )}
            {step === 'main' && mode === 'register' && (
              <label>CONFIRM PASSWORD
                <input name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={field} required minLength="8" />
              </label>
            )}

            {isOtpEntry && (
              <label>6-DIGIT CODE
                <input name="otp" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={form.otp} onChange={field} required autoFocus placeholder="000000" className="otp-input" />
              </label>
            )}

            {isNewPassword && (
              <>
                <label>NEW PASSWORD
                  <input name="password" type="password" autoComplete="new-password" value={form.password} onChange={field} required minLength="8" />
                </label>
                <label>CONFIRM PASSWORD
                  <input name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={field} required minLength="8" />
                </label>
              </>
            )}

            {error && <p className="form-message form-error" role="alert">{error}</p>}
            {message && <p className="form-message" role="status">{message}</p>}
            <button className="button button-orange auth-submit" type="submit" disabled={busy}>
              {busy ? 'PLEASE WAIT…'
                : isOtpEntry ? 'VERIFY CODE'
                : isNewPassword ? 'UPDATE PASSWORD'
                : mode === 'login' ? 'SIGN IN'
                : mode === 'register' ? 'CREATE ACCOUNT'
                : 'SEND RESET CODE'}
            </button>

            {isOtpEntry && (
              <button type="button" className="auth-resend" onClick={resendOtp} disabled={cooldown > 0 || busy}>
                {cooldown > 0 ? `RESEND IN ${cooldown}s` : 'RESEND CODE'}
              </button>
            )}
          </form>

          <nav className="auth-links" aria-label="Account options">
            {step === 'main' && mode === 'login' && (
              <>
                <Link to="/forgot-password">Forgot password?</Link>
                <span>New here? <Link to="/register">Create an account</Link></span>
              </>
            )}
            {step === 'main' && mode === 'register' && (
              <span>Already a member? <Link to="/login">Sign in</Link></span>
            )}
            {step === 'main' && mode === 'forgot' && (
              <Link to="/login">Back to sign in</Link>
            )}
            {step !== 'main' && (
              <button type="button" className="auth-back-link" onClick={() => {
                setStep('main'); setError(''); setMessage(''); setResetToken('');
              }}>
                ← Back
              </button>
            )}
          </nav>
        </section>
      </main>
    </StoreLayout>
  );
}
