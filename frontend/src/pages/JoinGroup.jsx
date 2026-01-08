import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import React from 'react';
import ThemeToggle from '../components/ThemeToggle';

const JoinGroup = () => {
    const { inviteCode } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [status, setStatus] = useState('Joining...');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        const join = async () => {
            if (!currentUser) return; // Wait for auth
            try {
                const token = await currentUser.getIdToken();
                const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/join`,
                    { inviteCode },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setStatus('Joined successfully! Redirecting...');
                setTimeout(() => {
                    navigate(`/group/${res.data.groupId}`);
                }, 1500);
            } catch (error) {
                console.error('Join error', error);
                setIsError(true);
                setStatus('Failed to join group: ' + (error.response?.data?.message || error.message));
            }
        };

        if (currentUser) {
            join();
        } else {
            // Ideally redirect to login with return url, but simple redirect for now
            // User needs to be logged in to join
            setIsError(true);
            setStatus('Please log in to join.');
            setTimeout(() => navigate('/login'), 2000);
        }
    }, [inviteCode, currentUser, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-main p-4 relative overflow-hidden transition-colors duration-300">
            {/* Ambient Background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 opacity-50 dark:opacity-100 transition-opacity">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <div className="glass-card p-10 rounded-3xl w-full max-w-md relative text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl ${isError ? 'bg-red-500/10 shadow-red-500/20' : 'bg-indigo-500/10 shadow-indigo-500/20'}`}>
                    {isError ? (
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    ) : (
                        <svg className="w-8 h-8 text-indigo-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    )}
                </div>

                <h2 className="text-2xl font-bold text-primary mb-2 tracking-tight">
                    {isError ? 'Error Joining Group' : 'Joining Group'}
                </h2>
                <p className="text-secondary">
                    {status}
                </p>

                {!isError && (
                    <div className="mt-8 flex justify-center">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JoinGroup;
