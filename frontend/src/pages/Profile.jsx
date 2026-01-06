import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
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

            // 1. Update in Firebase Auth (Client side)
            // Note: For full consistency we usually update backend first then reload, 
            // but Firebase Client SDK update is faster for UI reflection.
            // However, to keep it simple and consistent with our backend "source of truth",
            // we will call our backend API.

            await axios.put('http://localhost:5000/api/auth/profile',
                { displayName, photoURL },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Reload user to get fresh token/claims if needed (optional)
            // or just rely on backend sync.
            // Ideally we should also update the firebase auth profile locally so the context updates immediately.
            // But for now let's rely on the backend success.

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
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <Link to="/dashboard" className="text-teal-600 hover:text-teal-800 font-medium">&larr; Back to Dashboard</Link>
                    <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
                </div>

                <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-teal-400 to-violet-500"></div>
                    <div className="px-8 pb-8">
                        <div className="relative -mt-16 mb-6">
                            <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-gray-200 shadow-md">
                                {photoURL ? (
                                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400 font-bold">
                                        {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {status && (
                            <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${status.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {status}
                            </div>
                        )}

                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                                    placeholder="Your Name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                                <input
                                    type="url"
                                    value={photoURL}
                                    onChange={(e) => setPhotoURL(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                                    placeholder="https://example.com/avatar.jpg"
                                />
                                <p className="mt-1 text-xs text-gray-500">Paste a direct link to an image.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium rounded-lg shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
