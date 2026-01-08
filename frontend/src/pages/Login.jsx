import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import React from 'react';
import ThemeToggle from '../components/ThemeToggle';
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard');
        } catch (err) {
            setError('Failed to login. ' + err.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            navigate('/dashboard');
        } catch (err) {
            setError('Failed to google login. ' + err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-main px-4 relative overflow-hidden transition-colors duration-300">
            {/* Ambient Background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 opacity-50 dark:opacity-100 transition-opacity">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <div className="glass-card p-10 rounded-3xl w-full max-w-md relative hover:-translate-y-0 hover:shadow-2xl transition-all duration-500">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-[100px] -z-10"></div>

                <div className="relative z-10">
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </div>
                        <h2 className="text-3xl font-bold text-primary mb-2 tracking-tight">Welcome Back</h2>
                        <p className="text-secondary">Sign in to access your secure documents</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-3">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Email</label>
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="input-field w-full px-4 py-3.5"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="input-field w-full px-4 py-3.5"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                className="btn-primary w-full py-3.5 text-base shadow-lg shadow-indigo-500/25"
                            >
                                Sign In
                            </button>
                        </div>
                    </form>

                    <div className="my-8 flex items-center gap-4">
                        <div className="flex-1 h-px bg-white/10"></div>
                        <span className="text-xs font-bold text-secondary uppercase tracking-wider">Or continue with</span>
                        <div className="flex-1 h-px bg-white/10"></div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full py-3.5 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg group"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>Google</span>
                    </button>

                    <p className="mt-8 text-center text-sm text-secondary">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-indigo-400 font-bold hover:text-indigo-300 hover:underline transition-colors">
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>

            <div className="fixed bottom-6 text-xs text-secondary font-medium">
                © {new Date().getFullYear()} PDF Secure. All rights reserved.
            </div>
        </div>
    );
};

export default Login;
