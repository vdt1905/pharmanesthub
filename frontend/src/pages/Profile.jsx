import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import React from 'react';
const Profile = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Local state for form fields
    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setDisplayName(currentUser.displayName || '');
            setPhotoURL(currentUser.photoURL || '');
        }
    }, [currentUser]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus('');

        try {
            const token = await currentUser.getIdToken();

            await axios.put(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/profile`,
                { displayName, photoURL },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setStatus('Profile updated successfully!');
            setTimeout(() => setStatus(''), 3000);

        } catch (error) {
            console.error('Update profile error', error);
            setStatus('Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-main p-4 md:p-8 relative overflow-hidden text-primary selection:bg-indigo-500/30 transition-colors duration-300">
            {/* Ambient Background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 opacity-50 dark:opacity-100 transition-opacity">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="max-w-2xl mx-auto animate-fade-in-up">
                <div className="mb-8 flex items-center justify-between">
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-2 text-secondary hover:text-primary transition-colors group"
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        <span className="font-semibold">Back to Dashboard</span>
                    </Link>
                    <ThemeToggle />
                </div>

                <div className="glass-panel overflow-hidden relative">
                    {/* Header Banner */}
                    <div className="h-40 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 relative">
                        <div className="absolute inset-0 bg-grid-slate-700/[0.1] -z-10"></div>
                        <h1 className="sr-only">Edit Profile</h1>
                    </div>

                    <div className="px-8 pb-10">
                        <div className="relative -mt-16 mb-8 flex flex-col items-center sm:items-start">
                            <div className="w-32 h-32 rounded-3xl border-4 border-slate-900 overflow-hidden bg-slate-800 shadow-2xl relative group cursor-pointer">
                                {photoURL ? (
                                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl text-slate-600 font-bold bg-slate-800">
                                        {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                </div>
                            </div>
                            <h2 className="mt-4 text-2xl font-bold text-primary text-center sm:text-left tracking-tight">
                                {displayName || 'User Profile'}
                            </h2>
                            <p className="text-secondary text-sm font-medium">{currentUser?.email}</p>
                        </div>

                        {status && (
                            <div className={`mb-8 p-4 rounded-xl text-sm font-bold flex items-center gap-3 border ${status.includes('Failed') ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-green-500/10 border-green-500/20 text-green-300'}`}>
                                {status.includes('Failed') ? (
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                ) : (
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                )}
                                {status}
                            </div>
                        )}

                        <form onSubmit={handleUpdate} className="space-y-8 max-w-xl">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Display Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg className="w-5 h-5 text-secondary group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="input-field w-full pl-12 pr-4 py-3.5"
                                            placeholder="Your Name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Avatar URL</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg className="w-5 h-5 text-secondary group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        </div>
                                        <input
                                            type="url"
                                            value={photoURL}
                                            onChange={(e) => setPhotoURL(e.target.value)}
                                            className="input-field w-full pl-12 pr-4 py-3.5"
                                            placeholder="https://example.com/avatar.jpg"
                                        />
                                    </div>
                                    <p className="text-[10px] text-secondary font-medium ml-1">Only direct image links are supported (JPG, PNG, WebP)</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto px-8 btn-primary h-12 text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                            >
                                {loading && <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>}
                                {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
