import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import React from 'react';
const Dashboard = () => {
    const [groups, setGroups] = useState([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();

    useEffect(() => {
        fetchGroups();
    }, [currentUser]);

    const fetchGroups = async () => {
        if (!currentUser) return;
        try {
            const token = await currentUser.getIdToken();
            const res = await axios.get('http://localhost:5000/api/groups', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGroups(res.data);
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const createGroup = async (e) => {
        e.preventDefault();
        try {
            const token = await currentUser.getIdToken();
            await axios.post('http://localhost:5000/api/groups/create',
                { name: newGroupName, description: 'Secure Group' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNewGroupName('');
            fetchGroups();
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Failed to create group');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-violet-500 rounded-lg shadow-sm"></div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-violet-600">SecureShare</h1>
                        </div>
                        <div className="flex items-center space-x-6">
                            <Link to="/profile" className="flex items-center text-gray-600 hover:text-teal-600 transition-colors font-medium">
                                <span className="mr-2">{currentUser?.displayName || 'Profile'}</span>
                                {currentUser?.photoURL ? (
                                    <img src={currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">
                                        {currentUser?.email?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </Link>
                            <button
                                onClick={() => auth.signOut()}
                                className="text-gray-500 hover:text-red-500 transition-colors font-medium text-sm"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">

                {/* Hero Section */}
                <div className="mb-12 text-center">
                    <h2 className="text-4xl font-extrabold text-gray-900 mb-2">My Groups</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto">Create or join secure groups to share your PDF documents with end-to-end control.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left: Create Group */}
                    <div className="lg:w-1/3">
                        <div className="bg-white p-6 rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 sticky top-24">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                </span>
                                Create New Group
                            </h3>
                            <form onSubmit={createGroup} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                                    <input
                                        type="text"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        placeholder="e.g. Project Alpha"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                >
                                    Create Group
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Group List */}
                    <div className="lg:w-2/3">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {groups.map((group) => (
                                    <Link
                                        key={group.id}
                                        to={`/group/${group.id}`}
                                        className="group block relative bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 border border-gray-100 transition-all duration-300 transform hover:-translate-y-1"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                        </div>
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 text-xl font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                            {group.name.charAt(0).toUpperCase()}
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{group.name}</h4>
                                        <p className="text-sm text-gray-500">{group.description}</p>
                                        <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                                            <span>{group.members ? group.members.length : 1} Members</span>
                                            <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </Link>
                                ))}
                                {groups.length === 0 && (
                                    <div className="col-span-full bg-white p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                                        </div>
                                        <p className="text-gray-500 font-medium">No groups yet.</p>
                                        <p className="text-gray-400 text-sm">Create your first group to get started.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );

};

export default Dashboard;
