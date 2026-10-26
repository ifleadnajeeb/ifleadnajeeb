import { useState, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth-provider';
import { getErrorMessage } from '@/shared/api/client';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden bg-white"
      style={{
        backgroundImage: 'url("/login-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <form
        onSubmit={onSubmit}
        noValidate
        className="relative z-10 w-full max-w-[440px] bg-white rounded-[20px] px-8 py-10 shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-gray-100"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-12 h-12 rounded-[10px] bg-[#E3001B] flex items-center justify-center shrink-0">
            <span className="text-white font-black text-[30px] leading-none -mt-1 font-sans">if</span>
          </div>
          <span className="text-[42px] font-black text-black leading-none tracking-tighter">LEADS</span>
        </div>

        <h1 className="text-center text-[24px] font-bold text-black leading-tight mb-1.5">
          Welcome Back
        </h1>
        <p className="text-center text-[14.5px] text-gray-500 mb-8">
          Sign in to continue
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[13px] text-gray-600 mb-1.5">
              Email
            </label>
            <input
              id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username" placeholder="name@company.com"
              className="w-full h-11 px-3.5 border border-gray-200 rounded-lg text-[14.5px] bg-white text-black focus:outline-none focus:border-[#E3001B] focus:ring-1 focus:ring-[#E3001B] transition-all"
            />
          </div>

          <div>
            <label htmlFor="pw" className="block text-[13px] text-gray-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="pw" type={showPw ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" placeholder="••••••••"
                className="w-full h-11 px-3.5 pr-16 border border-gray-200 rounded-lg text-[14.5px] bg-white text-black focus:outline-none focus:border-[#E3001B] focus:ring-1 focus:ring-[#E3001B] transition-all"
              />
              <button
                type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-transparent px-2 py-2 text-[13px] text-gray-500 hover:text-black font-medium"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-5 mb-5">
          <label className="flex items-center gap-2 text-[13.5px] text-gray-700 cursor-pointer">
            <div className="relative flex items-center justify-center w-[18px] h-[18px]">
              <input
                type="checkbox" checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="peer appearance-none w-[18px] h-[18px] border border-gray-300 rounded-[4px] checked:bg-[#E3001B] checked:border-[#E3001B] cursor-pointer transition-colors"
              />
              <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 14 14" fill="none">
                <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setError('Password reset links are sent by the server in production.')}
            className="border-0 bg-transparent text-[#E3001B] text-[13.5px] font-semibold hover:text-red-700 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <div role="alert" className="min-h-[18px] text-[13px] text-red-500 mb-2 font-medium">
          {error}
        </div>

        <button
          type="submit" disabled={submitting}
          className="w-full h-12 rounded-lg bg-[#E3001B] text-white font-bold text-[15px] tracking-wide hover:bg-red-700 active:bg-red-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-red-500/20"
        >
          {submitting ? 'Signing in…' : 'LOGIN'}
        </button>      </form>
    </div>
  );
}
