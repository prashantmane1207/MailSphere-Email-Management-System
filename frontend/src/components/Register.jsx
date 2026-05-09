import React, { useMemo, useState } from 'react';
import { MailPlus, Eye, EyeOff } from 'lucide-react';

export default function Register({ onRegister, onNavigateLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    dob: '',
    contact: ''
  });
  const [error, setError] = useState('');
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [notification, setNotification] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const sanitizeLocalPart = (value) => (value || '').toLowerCase().replace(/[^a-z0-9._-]/g, '');

  const generateLiveEmailSuggestions = (rawEmail, rawUsername) => {
    const commonDomains = ['jmail.com'];
    const emailInput = String(rawEmail || '').trim().toLowerCase();
    const usernameBase = sanitizeLocalPart(String(rawUsername || '').replace(/\s+/g, ''));

    if (!emailInput && usernameBase) {
      return [
        `${usernameBase}@jmail.com`,
        `${usernameBase}${new Date().getFullYear()}@jmail.com`,
        `${usernameBase}official@jmail.com`
      ];
    }

    if (!emailInput.includes('@')) {
      const local = sanitizeLocalPart(emailInput);
      if (!local) return [];
      return commonDomains.slice(0, 3).map(domain => `${local}@${domain}`);
    }

    const [localRaw, domainRaw = ''] = emailInput.split('@', 2);
    const local = sanitizeLocalPart(localRaw);
    if (!local) return [];

    if (!domainRaw) {
      return commonDomains.slice(0, 3).map(domain => `${local}@${domain}`);
    }

    const matchingDomains = commonDomains.filter(domain => domain.startsWith(domainRaw));
    const completedDomains = matchingDomains.length > 0
      ? matchingDomains
      : [domainRaw.includes('.') ? domainRaw : `${domainRaw}.com`];

    return [...new Set(completedDomains.map(domain => `${local}@${domain}`))]
      .filter(candidate => candidate !== emailInput)
      .slice(0, 3);
  };

  const liveEmailSuggestions = useMemo(
    () => generateLiveEmailSuggestions(formData.email, formData.username),
    [formData.email, formData.username]
  );

  const hasServerSuggestions = emailSuggestions.length > 0;
  const suggestionsToShow = hasServerSuggestions ? emailSuggestions : liveEmailSuggestions;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEmailSuggestions([]);

    if (!formData.dob) {
      setError('Date of Birth is required.');
      return;
    }

    const birthday = new Date(formData.dob);
    const ageDifMs = Date.now() - birthday.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (age < 14) {
      setError('You must be at least 14 years old to register.');
      return;
    }

    const hasContact = formData.contact && String(formData.contact).trim() !== '';

    if (hasContact && !otpSent) {
      setLoading(true);
      try {
        const otpRes = await fetch('/api/auth/send-registration-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact: Number(formData.contact) })
        });

        if (!otpRes.ok) {
          const otpError = await otpRes.text();
          throw new Error(otpError || 'Failed to send OTP.');
        }

        const otpData = await otpRes.json();
        setOtpSent(true);
        setOtpValue('');

        if (otpData?.otp) {
          showNotification(`OTP sent successfully`);
        } else {
          showNotification(`OTP sent successfully`);
        }
        return;
      } catch (err) {
        const message = err instanceof TypeError
          ? 'Cannot reach backend. Make sure Spring Boot is running on port 8080.'
          : err.message;
        setError(message);
        return;
      } finally {
        setLoading(false);
      }
    }

    if (hasContact && otpValue.trim().length !== 6) {
      setError('Please enter the 6-digit OTP sent to your contact number.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        username: formData.username.trim(),
        email: formData.email.trim(),
        dob: formData.dob || null,
        contact: formData.contact === '' ? null : Number(formData.contact),
        otp: hasContact ? otpValue.trim() : null
      };

      if (payload.contact !== null && Number.isNaN(payload.contact)) {
        throw new Error('Contact number is invalid.');
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errJson = await res.json();
          if (Array.isArray(errJson.suggestions)) {
            setEmailSuggestions(errJson.suggestions);
          }
          throw new Error(errJson.message || 'Registration failed.');
        }
        const errText = await res.text();
        throw new Error(errText || 'Registration failed.');
      }
      const data = await res.json();
      onRegister(data);
    } catch (err) {
      const message = err instanceof TypeError
        ? 'Cannot reach backend. Make sure Spring Boot is running on port 8080.'
        : err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      {notification && (
        <div style={{ position: 'fixed', top: '24px', left: '24px', background: '#22c55e', color: 'white', padding: '14px 24px', borderRadius: '6px', zIndex: 100, fontSize: '0.95rem', fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', animation: 'slideInLeft 0.3s ease-out' }}>
          {notification}
        </div>
      )}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '40px', textAlign: 'center' }}>
        <MailPlus size={48} color="var(--primary-color)" style={{ marginBottom: '20px' }} />
        <h2 style={{ marginBottom: '8px' }}>Create Account</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Join the real-time Jmail</p>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>{error}</div>}

        {suggestionsToShow.length > 0 && (
          <div style={{ marginBottom: '16px', textAlign: 'left', background: 'rgba(59, 130, 246, 0.08)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {hasServerSuggestions ? 'Try one of these available emails:' : 'Suggested email IDs:'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {suggestionsToShow.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, email: suggestion }));
                    setError('');
                  }}
                  style={{
                    textAlign: 'left',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: 'var(--primary-color)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Use {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="text" placeholder="Full Name" className="input-field" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
          <input
            type="email"
            placeholder="Email Address"
            className="input-field"
            value={formData.email}
            onChange={e => {
              setFormData({ ...formData, email: e.target.value });
              if (emailSuggestions.length > 0) setEmailSuggestions([]);
            }}
            required
          />
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? "text" : "password"} placeholder="Password" className="input-field" style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
            <div onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <input type="date" placeholder="Date of Birth" className="input-field" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} style={{ flex: 1 }} />
            <input type="number" placeholder="Contact" className="input-field" value={formData.contact} onChange={e => {
              setFormData({ ...formData, contact: e.target.value });
              if (otpSent) {
                setOtpSent(false);
                setOtpValue('');
              }
            }} style={{ flex: 1 }} />
          </div>

          {otpSent && (
            <input type="text" placeholder="Enter 6-digit OTP" className="input-field" value={otpValue} onChange={e => setOtpValue(e.target.value)} required />
          )}

          <button type="submit" className="btn" style={{ marginTop: '8px' }} disabled={loading}>
            {loading ? 'Processing...' : (formData.contact && String(formData.contact).trim() !== '' && !otpSent ? 'Send OTP' : 'Sign Up')}
          </button>
        </form>

        <p style={{ marginTop: '32px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Already have an account? <span style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 500 }} onClick={onNavigateLogin}>Sign In</span>
        </p>
      </div>
    </div>
  );
}
