import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import XyberixLogo from '../assets/xyberixcorelogo.png';

const Login = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password) return;
        setError('');
        setLoading(true);
        const result = await login(username.trim(), password);
        setLoading(false);
        if (!result.success) setError(result.error);
    };

    return (
        <div className="min-h-screen bg-darker flex items-center justify-center p-4">
            <div className="w-full max-w-sm">

                {/* Brand */}
                <div className="text-center mb-8">
                    <img
                        src={XyberixLogo}
                        alt="Xyberix Core"
                        className="h-28 w-28 mx-auto mb-2 object-cover rounded-2xl"
                    />
                    <h1 className="text-2xl font-bold text-white">Xyberix Core</h1>
                    <p className="text-slate-400 text-sm mt-1">Sign in to continue</p>
                </div>

                {/* Card */}
                <div className="bg-dark rounded-2xl border border-white/5 p-6 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                                Username
                            </label>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                autoFocus
                                autoComplete="username"
                                className="bg-slate-800/60 border-slate-700 text-white placeholder-slate-500 hover:bg-slate-800/60 hover:border-slate-600 focus-visible:bg-slate-800/80 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="current-password"
                                    className="bg-slate-800/60 border-slate-700 text-white placeholder-slate-500 hover:bg-slate-800/60 hover:border-slate-600 focus-visible:bg-slate-800/80 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2.5">
                                <p className="text-rose-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <Button
                            type="submit"
                            className="w-full mt-1"
                            size="lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="h-4 w-4" /> Sign In
                                </>
                            )}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-xs text-slate-600 mt-6">
                    Xyberix Core &mdash; Internal use only
                </p>
            </div>
        </div>
    );
};

export default Login;
