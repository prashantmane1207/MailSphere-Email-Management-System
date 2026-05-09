import React, { useState } from 'react';
import { Mail, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLogin, onNavigateRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [requires2fa, setRequires2fa] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempUserId, setTempUserId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    let loginEmail = email.trim();
    if (loginEmail && !loginEmail.includes('@')) {
      loginEmail += '@jmail.com';
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Login failed. Please check credentials.');
      }
      const data = await res.json();
      if (data.requires2fa) {
        setRequires2fa(true);
        setTempUserId(data.userId);
        setSuccessMessage('Please enter your 2FA code to continue.');
      } else {
        onLogin(data);
      }
    } catch (err) {
      const message = err instanceof TypeError
        ? 'Cannot reach backend. Make sure Spring Boot is running on port 8080.'
        : err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempUserId, code: otpCode })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Invalid OTP.');
      }
      const data = await res.json();
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);

    let resetEmail = forgotEmail.trim();
    if (resetEmail && !resetEmail.includes('@')) {
      resetEmail += '@jmail.com';
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, newPassword })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to reset password.');
      }

      setSuccessMessage('Password reset successful. Please sign in with your new password.');
      setEmail(forgotEmail);
      setPassword('');
      setForgotMode(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      const message = err instanceof TypeError
        ? 'Cannot reach backend. Make sure Spring Boot is running on port 8080.'
        : err.message;
      setError(message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px', textAlign: 'center' }}>
        <Mail size={48} color="var(--primary-color)" style={{ marginBottom: '20px' }} />
        <h2 style={{ marginBottom: '8px' }}>{forgotMode ? 'Reset Password' : 'Welcome Back'}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
          {forgotMode ? 'Enter your email and set a new password' : 'Sign in to continue to Gmail Clone'}
        </p>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>{error}</div>}
        {successMessage && <div style={{ color: 'var(--success)', marginBottom: '16px', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>{successMessage}</div>}

        {requires2fa ? (
          <form onSubmit={handleVerify2FA} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="text" placeholder="6-digit Authenticator Code" className="input-field" value={otpCode} onChange={e => setOtpCode(e.target.value)} required />
            <button type="submit" className="btn" style={{ marginTop: '8px' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button type="button" onClick={() => { setRequires2fa(false); setError(''); setSuccessMessage(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
              Cancel
            </button>
          </form>
        ) : !forgotMode ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="text" placeholder="Email or Username (e.g. test@jmail.com)" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? "text" : "password"} placeholder="Password" className="input-field" style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} value={password} onChange={e => setPassword(e.target.value)} required />
              <div onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>
            <div style={{ textAlign: 'right', marginTop: '-8px' }}>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true);
                  setForgotEmail(email);
                  setError('');
                  setSuccessMessage('');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
            <button type="submit" className="btn" style={{ marginTop: '8px' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="text" placeholder="Registered email or username" className="input-field" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="New password (min 6 characters)"
                className="input-field"
                style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <div onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmNewPassword ? "text" : "password"}
                placeholder="Confirm new password"
                className="input-field"
                style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                required
              />
              <div onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>

            <button type="submit" className="btn" style={{ marginTop: '8px' }} disabled={forgotLoading}>
              {forgotLoading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForgotMode(false);
                setError('');
                setNewPassword('');
                setConfirmNewPassword('');
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Back to Sign In
            </button>
          </form>
        )}

        {!forgotMode && !requires2fa && (
          <p style={{ marginTop: '32px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Don't have an account? <span style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 500 }} onClick={onNavigateRegister}>Create account</span>
          </p>
        )}
      </div>
    </div>
  );
}
