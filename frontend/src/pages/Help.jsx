import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.jpg';

const Help = () => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <nav className="bg-white/70 backdrop-blur-xl border-b border-white/40 sticky top-0 z-50 transition-all duration-300 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="Logo" className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-violet-600">PharmaNestHub</h1>
                        </div>
                        <Link to="/dashboard" className="text-slate-500 hover:text-indigo-600 font-bold transition-colors">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-black text-slate-900 mb-4">Help & Support</h2>
                    <p className="text-lg text-slate-600">Got questions? We're here to help.</p>
                </div>

                <div className="grid gap-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </span>
                            Wait, I can't create a group?
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            Currently, group creation is restricted to administrators only to ensure platform security and quality control. If you need a new group for your organization, please contact the admin directly.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            </span>
                            Contact Support
                        </h3>
                        <p className="text-slate-600 mb-4">
                            For technical issues, account support, or feature requests, please drop us an email.
                        </p>
                        <a href="mailto:@pharmanesthubgmail.com" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors">
                            Contact Admin
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Help;
