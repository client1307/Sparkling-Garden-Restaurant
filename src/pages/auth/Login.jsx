import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, ChefHat, Shield, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { login } from '../../services/api';
import toast from 'react-hot-toast';

const DEMO_CREDENTIALS = {
    admin: { email: 'admin@sparkling.com', password: 'admin123', label: 'Admin' },
    waiter: { email: 'waiter@sparkling.com', password: 'waiter123', label: 'Waiter' },
    kitchen: { email: 'chef@sparkling.com', password: 'chef123', label: 'Kitchen (Chef)' },
};

const Login = ({ role: roleProp }) => {
    const role = roleProp.toLowerCase();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Reset fields when role changes
    useEffect(() => {
        setEmail('');
        setPassword('');
        setError('');
    }, [role]);

    const handleAutofill = (targetRole = role) => {
        const cred = DEMO_CREDENTIALS[targetRole] || DEMO_CREDENTIALS.admin;
        setEmail(cred.email);
        setPassword(cred.password);
        setError('');
        toast.success(`Autofilled ${cred.label} credentials!`, { id: 'autofill' });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        
        if (!email) {
            setError('Email is required');
            return;
        }

        if (!password) {
            setError('Password is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await login(email, password);
            
            if (!response || !response.token) {
                setError('Invalid response from server');
                return;
            }

            // Store user info
            localStorage.setItem('user', JSON.stringify(response));
            localStorage.setItem('token', response.token);
            toast.success(`Welcome, ${response.name}!`);

            // Redirect based on role
            if (response.role === 'kitchen') {
                navigate('/kitchen/dashboard');
            } else if (response.role === 'waiter') {
                navigate('/waiter/dashboard');
            } else if (response.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/table/1/menu');
            }
        } catch (err) {
            console.error('Login error:', err);
            if (!err.response) {
                setError('Cannot connect to server. The backend may be restarting or offline.');
                toast.error('Network error: Server unreachable');
            } else {
                setError(err.response?.data?.message || 'Invalid credentials');
                toast.error(err.response?.data?.message || 'Login failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F6F0] flex items-center justify-center p-4 relative overflow-hidden text-[#222222]">
            {/* Background Organic Shapes */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-[#BCE2A3]/30 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#5A724A]/12 rounded-full blur-[110px]" />
            </div>

            <div className="absolute top-8 text-center w-full z-10">
                <a href="/" className="inline-block transition-transform hover:scale-105">
                    <img src="/images/sparkling-logo-dark.png" alt="The Sparkling" className="h-12 md:h-14 w-auto mx-auto object-contain" />
                </a>
            </div>

            <Card className="w-full max-w-md p-7 sm:p-9 relative z-10 bg-white border border-[#EBEBEB] mt-16 rounded-3xl shadow-[0_16px_40px_rgba(90,114,74,0.08)]">
                {/* Role switcher tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F4F6F0] rounded-2xl mb-6 border border-[#EBEBEB]">
                    <Link
                        to="/admin/login"
                        className={`py-2 text-xs font-bold rounded-xl text-center transition-all ${
                            role === 'admin'
                                ? 'bg-[#5A724A] text-white shadow-xs'
                                : 'text-[#818181] hover:text-[#222222] hover:bg-white/60'
                        }`}
                    >
                        Admin
                    </Link>
                    <Link
                        to="/waiter/login"
                        className={`py-2 text-xs font-bold rounded-xl text-center transition-all ${
                            role === 'waiter'
                                ? 'bg-[#5A724A] text-white shadow-xs'
                                : 'text-[#818181] hover:text-[#222222] hover:bg-white/60'
                        }`}
                    >
                        Waiter
                    </Link>
                    <Link
                        to="/kitchen/login"
                        className={`py-2 text-xs font-bold rounded-xl text-center transition-all ${
                            role === 'kitchen'
                                ? 'bg-[#5A724A] text-white shadow-xs'
                                : 'text-[#818181] hover:text-[#222222] hover:bg-white/60'
                        }`}
                    >
                        Kitchen
                    </Link>
                </div>

                <motion.div
                    key={role}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-center mb-6"
                >
                    <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-[#BCE2A3]/35 text-[#425934] border border-[#BCE2A3] shadow-xs">
                        {role === 'kitchen' ? <ChefHat size={26} /> : role === 'admin' ? <Shield size={26} /> : <User size={26} />}
                    </div>
                    <h1 className="text-2xl font-extrabold text-[#222222] tracking-tight">{roleProp} Portal</h1>
                    <p className="text-[#818181] mt-0.5 text-xs">Sign in to authenticate with staff credentials</p>
                </motion.div>

                {/* Autofill Credentials Box */}
                <div className="mb-5 p-3.5 bg-[#F8FAF6] border border-[#BCE2A3] rounded-2xl flex items-center justify-between gap-3">
                    <div className="text-left text-xs min-w-0">
                        <span className="font-bold text-[#425934] block text-[11px] uppercase tracking-wider">Demo Credentials</span>
                        <div className="text-xs text-[#5A724A] font-mono truncate font-semibold mt-0.5">
                            {DEMO_CREDENTIALS[role]?.email}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleAutofill(role)}
                        className="px-3.5 py-1.5 bg-[#5A724A] hover:bg-[#485D3B] text-white text-xs font-bold rounded-full transition-colors shrink-0 shadow-xs flex items-center gap-1.5 cursor-pointer"
                        title="Click to automatically fill credentials"
                    >
                        <Zap size={13} className="text-amber-300 fill-amber-300" />
                        Autofill
                    </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#818181] ml-1">Email / Username</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-3.5 text-[#818181] group-focus-within:text-[#5A724A] transition-colors" size={17} />
                            <input
                                type="text"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl focus:border-[#5A724A] focus:bg-white focus:ring-2 focus:ring-[#5A724A]/10 transition-all outline-none text-[#222222] placeholder:text-[#818181]/50 text-sm font-medium"
                                placeholder="name@sparkling.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#818181] ml-1">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 text-[#818181] group-focus-within:text-[#5A724A] transition-colors" size={17} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl focus:border-[#5A724A] focus:bg-white focus:ring-2 focus:ring-[#5A724A]/10 transition-all outline-none text-[#222222] placeholder:text-[#818181]/50 text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={isLoading}
                        variant="primary"
                        className="w-full mt-2 py-3.5 text-sm font-bold rounded-full shadow-[0_4px_16px_rgba(90,114,74,0.3)] flex items-center justify-center gap-2"
                    >
                        {isLoading ? 'Verifying...' : <>Sign in as {roleProp} <ArrowRight size={16} /></>}
                    </Button>
                </form>

                <div className="mt-6 pt-4 border-t border-[#EBEBEB] text-center space-y-2.5">
                    <div className="flex items-center justify-center gap-2 text-xs text-[#818181]">
                        <span>Switch:</span>
                        <Link to="/admin/login" className={`hover:underline ${role === 'admin' ? 'font-bold text-[#5A724A]' : ''}`}>Admin</Link>
                        <span>•</span>
                        <Link to="/waiter/login" className={`hover:underline ${role === 'waiter' ? 'font-bold text-[#5A724A]' : ''}`}>Waiter</Link>
                        <span>•</span>
                        <Link to="/kitchen/login" className={`hover:underline ${role === 'kitchen' ? 'font-bold text-[#5A724A]' : ''}`}>Kitchen</Link>
                        <span>•</span>
                        <Link to="/portal" className="hover:underline font-semibold">Portal</Link>
                    </div>
                    <div>
                        <Link to="/" className="text-xs text-[#818181] hover:text-[#5A724A] font-semibold transition-colors">
                            ← Return to Website
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Login;
