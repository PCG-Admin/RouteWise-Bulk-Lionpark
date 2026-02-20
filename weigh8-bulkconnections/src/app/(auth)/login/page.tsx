"use client";

import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Allow HttpOnly cookie to be set by backend
                body: JSON.stringify({ email, password, siteId: 2 }),
            });

            const data = await response.json();

            if (response.ok) {
                // Token stored in HttpOnly cookie by backend — do not store in localStorage
                router.push("/operations/loading-board");
            } else {
                setError(data.error || "Invalid email or password");
            }
        } catch (err) {
            console.error('Login error:', err);
            setError("Failed to connect to the server");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 transition-colors">
            <div className="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

                <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                    {/* Logo */}
                    <div className="mb-2">
                        <Image
                            src="/Mindrift_Logo-06.png"
                            alt="Mindrift"
                            width={180}
                            height={80}
                            className="object-contain dark:invert"
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
                            Courage to Transform. Power to Evolve
                        </p>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            Login
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            Enter your credentials to access the dashboard.
                        </p>
                    </div>

                    <form className="w-full space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2 text-left">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="bulk@email.com"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:text-white"
                                required
                            />
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="password123"
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:text-white pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-blue-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Signing in..." : "Login"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
