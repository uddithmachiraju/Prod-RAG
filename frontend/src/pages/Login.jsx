import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const { theme } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      if (isLogin) {
        const response = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Login failed. Please check your credentials.');
        }

        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify({
          name: data.full_name,
          username: data.username,
          email: email,
          role: 'Admin',
        }));

        navigate('/dashboard');
      } else {
        const response = await fetch(`${baseUrl}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            full_name: fullName,
            email,
            password,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Registration failed. Please check your input.');
        }

        setSuccess('Registration successful! Please check your email to verify your account.');
        setFullName('');
        setUsername('');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-150">
      <div className="relative w-full max-w-4xl flex items-center gap-12">
        {/* Left: Hero */}
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
          className="flex-1 hidden lg:block">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/30">D</div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">Docura AI</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">AI-Powered Knowledge Assistant</div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
            Chat with your <span className="text-gradient">knowledge base</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 leading-relaxed">
            Ask questions, retrieve accurate answers, and interact with your documents using Retrieval-Augmented Generation.
          </p>
          {/* Feature highlights */}
          <div className="space-y-3">
            {['Instant Q&A over documents', 'Accurate answers with citations', 'Secure & private', 'Easy file upload'].map((f, i) => (
              <motion.div key={f} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="w-5 h-5 rounded-full bg-primary/10 dark:bg-primary/30 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm">{f}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right: Login Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-sm">
          <div className="rounded-3xl p-8 shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors duration-150">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
                RAG Chatbot
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {isLogin ? 'Sign in to your workspace' : 'Get started with Docura AI'}
            </p>

            {error && (
              <div className="p-3 mb-4 text-xs font-semibold text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 mb-4 text-xs font-semibold text-emerald-700 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Full Name</label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
                      <User size={16} className="text-slate-400 flex-shrink-0" />
                      <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                        className="w-full text-sm outline-none bg-transparent text-slate-900 dark:text-slate-100" placeholder="John Doe" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Username</label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
                      <User size={16} className="text-slate-400 flex-shrink-0" />
                      <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                        className="w-full text-sm outline-none bg-transparent text-slate-900 dark:text-slate-100" placeholder="johndoe" required />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Email</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
                  <Mail size={16} className="text-slate-400 flex-shrink-0" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full text-sm outline-none bg-transparent text-slate-900 dark:text-slate-100" placeholder="you@company.com" required />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Password</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
                  <Lock size={16} className="text-slate-400 flex-shrink-0" />
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full text-sm outline-none bg-transparent text-slate-900 dark:text-slate-100" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-400 flex-shrink-0 hover:text-slate-600 dark:hover:text-slate-300">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {isLogin && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Remember me</span>
                  </label>
                  <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full btn-primary justify-center py-2.5 text-base disabled:opacity-70">
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  <><span>{isLogin ? 'Sign in' : 'Sign up'}</span><ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              {isLogin ? (
                <>
                  Don't have an account?{' '}
                  <button type="button" onClick={() => { setIsLogin(false); setError(null); setSuccess(null); }} className="text-primary font-semibold hover:underline">
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setIsLogin(true); setError(null); setSuccess(null); }} className="text-primary font-semibold hover:underline">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
