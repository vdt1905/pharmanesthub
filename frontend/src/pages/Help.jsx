import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.jpg';
import ThemeToggle from '../components/ThemeToggle';

const Help = () => {
    return (
        <div className="min-h-screen bg-main font-sans text-primary selection:bg-indigo-500/30 relative overflow-hidden transition-colors duration-300">
            {/* Ambient Background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 opacity-50 dark:opacity-100 transition-opacity">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            <nav className="glass-panel sticky top-0 z-50 border-x-0 border-t-0 border-b border-white/5 h-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                    <div className="flex justify-between items-center h-full">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 blur opacity-40 rounded-xl"></div>
                                <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg relative z-10 border border-white/10" />
                            </div>
                            <h1 className="text-xl font-bold text-primary tracking-tight">PharmaNestHub</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            <Link
                                to="/dashboard"
                                className="flex items-center gap-2 text-secondary hover:text-primary transition-colors group px-4 py-2 rounded-lg hover:bg-white/5"
                            >
                                <span className="font-semibold">Back to Dashboard</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-black text-primary mb-4 tracking-tight">Help & Support</h2>
                    <p className="text-lg text-secondary">Got questions? We're here to help.</p>
                </div>

                <div className="grid gap-6">
                    <div className="glass-card p-8 group hover:bg-white/5 transition-colors">
                        <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </span>
                            Wait, I can't create a group?
                        </h3>
                        <p className="text-secondary leading-relaxed pl-[52px]">
                            Currently, group creation is restricted to administrators only to ensure platform security and quality control. If you need a new group for your organization, please contact the admin directly.
                        </p>
                    </div>

                    <div className="glass-card p-8 group hover:bg-white/5 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:bg-teal-500/20 transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    </span>
                                    Contact Support
                                </h3>
                                <p className="text-secondary pl-[52px]">
                                    For technical issues, account support, or feature requests, please drop us an email.
                                </p>
                            </div>
                            <a
                                href="mailto:pharmanesthub@gmail.com"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg min-w-[160px] justify-center ml-[52px] md:ml-0"
                            >
                                Contact Admin
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Help;
