import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import JobTrackLogo from '../components/common/JobTrackLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { user, loginWithEmail, loginWithGoogle } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // If already authenticated, redirect to /dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const { user: loggedInUser, error } = await loginWithEmail(email, password);
    setIsSubmitting(false);

    if (error) {
      showError(error);
    } else if (loggedInUser) {
      showSuccess('Welcome back to JobTrack!');
      navigate('/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const { user: loggedInUser, error } = await loginWithGoogle();
    setIsGoogleLoading(false);

    if (error) {
      showError(error);
    } else if (loggedInUser) {
      showSuccess('Signed in with Google.');
      navigate('/dashboard');
    }
  };

  return (
    <div id="login-page-container" className="min-h-screen bg-surface flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <JobTrackLogo className="h-12 w-auto object-contain" />
        </div>
        <h1 id="login-heading" className="font-display-lg-mobile sm:font-display-lg text-on-surface font-bold tracking-tight">
          Welcome to JobTrack
        </h1>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
          Keep your job search organized, responsive, and calm.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div id="login-card" className="bg-surface-container-lowest py-8 px-6 sm:px-8 rounded-2xl border border-surface-container-high/30 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] space-y-5">
          {/* Google Sign-in Option */}
          <div>
            <button
              id="google-login-btn"
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-outline-variant/40 rounded-xl font-label-md text-label-md font-semibold text-on-surface bg-surface-container-low hover:bg-surface-container transition-all shadow-xs disabled:opacity-50 min-h-[44px]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-container-high/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface-container-lowest px-2 text-outline font-medium">Or continue with email</span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form id="email-login-form" className="space-y-4" onSubmit={handleEmailLogin}>
            <div>
              <label htmlFor="login-email" className="block font-label-md text-label-md text-on-surface mb-1">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block font-label-md text-label-md text-on-surface mb-1">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 px-4 bg-primary-container hover:bg-primary active:scale-[0.98] text-on-primary rounded-xl font-label-md text-label-md font-semibold transition-all shadow-xs disabled:opacity-50 min-h-[44px]"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>

          <div className="text-center font-body-sm text-body-sm text-on-surface-variant pt-1">
            Don&apos;t have an account yet?{' '}
            <Link id="link-to-register" to="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
