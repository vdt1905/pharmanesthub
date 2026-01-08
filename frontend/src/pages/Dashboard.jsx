import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import React from 'react';
import logo from '../assets/logo.jpg';
const Dashboard = () => {
    const [groups, setGroups] = useState([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [newGroupYear, setNewGroupYear] = useState('');
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const { currentUser } = useAuth();
    const [activeView, setActiveView] = useState('groups');
    // Initialize sidebar state based on window width
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [currentUser]);

    const fetchGroups = async () => {
        if (!currentUser) return;
        try {
            const token = await currentUser.getIdToken();
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups`, {
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
        if (isCreating) return;

        setIsCreating(true);
        try {
            const token = await currentUser.getIdToken();
            await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/create`,
                { name: newGroupName, description: newGroupDescription, year: newGroupYear },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNewGroupName('');
            setNewGroupDescription('');
            setNewGroupYear('');
            fetchGroups();
            setActiveView('groups');
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Failed to create group');
        } finally {
            setIsCreating(false);
        }
    };

    const deleteGroup = async (groupId, e) => {
        e.preventDefault(); // Prevent link navigation
        e.stopPropagation(); // Stop event bubbling
        if (!window.confirm("Are you sure you want to delete this group?")) return;

        try {
            const token = await currentUser.getIdToken();
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${groupId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchGroups(); // Refresh list
        } catch (error) {
            console.error('Error deleting group:', error);
            alert('Failed to delete group');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex relative">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && window.innerWidth < 768 && (
                <div
                    className="fixed inset-0 bg-black/50 z-30"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 flex flex-col
                ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'}
                h-full
            `}>
                <div className="h-16 flex items-center justify-center border-b border-slate-100">
                    {isSidebarOpen ? (
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="Logo" className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-violet-600">PharmaNestHub</h1>
                        </div>
                    ) : (
                        <img src={logo} alt="Logo" className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                    )}
                </div>

                <div className="flex-1 py-6 flex flex-col gap-2 px-2">
                    <button
                        onClick={() => { setActiveView('groups'); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === 'groups' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                        title="My Groups"
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        {isSidebarOpen && <span>My Groups</span>}
                    </button>

                    {/* Add Group (Admin Only) */}
                    {currentUser?.email === 'tandelvansh0511@gmail.com' && (
                        <button
                            onClick={() => { setActiveView('create_group'); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === 'create_group' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                            title="Add Group"
                        >
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            {isSidebarOpen && <span>Add Group</span>}
                        </button>
                    )}

                    <Link
                        to="/help"
                        onClick={() => { if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
                        title="Help & Doubts"
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {isSidebarOpen && <span>Help & Doubts</span>}
                    </Link>
                </div>

                <div className="p-4 border-t border-slate-100 hidden md:block">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                        title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                        {isSidebarOpen ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-1 transition-all duration-300 w-full ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-md shadow-sm h-16 sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between md:justify-end border-b border-gray-100">
                    <div className="flex items-center md:hidden">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-slate-500 hover:text-slate-700 p-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                        <span className="ml-2 font-bold text-lg text-slate-800">PharmaNestHub</span>
                    </div>

                    <div className="flex items-center space-x-6">
                        <Link to="/profile" className="flex items-center text-gray-600 hover:text-teal-600 transition-colors font-medium">
                            <span className="mr-2 hidden md:inline">{currentUser?.displayName || 'Profile'}</span>
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
                </header>

                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {activeView === 'create_group' && currentUser?.email === 'tandelvansh0511@gmail.com' ? (
                        <div className="max-w-2xl mx-auto animate-fade-in-up">
                            <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                <span className="p-3 bg-teal-100 text-teal-600 rounded-2xl">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                </span>
                                Create New Group
                            </h2>
                            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                                <form onSubmit={createGroup} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Group Name</label>
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            placeholder="e.g. Project Alpha"
                                            className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none font-medium"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                                        <textarea
                                            value={newGroupDescription}
                                            onChange={(e) => setNewGroupDescription(e.target.value)}
                                            placeholder="What is this group for?"
                                            className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none font-medium resize-none h-32"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Target Year</label>
                                        <input
                                            type="text"
                                            value={newGroupYear}
                                            onChange={(e) => setNewGroupYear(e.target.value)}
                                            placeholder="e.g. 1st Year, 2024"
                                            className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none font-medium"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className={`w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 transition-all duration-200 flex items-center justify-center ${isCreating ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-teal-500/50 hover:scale-[1.02] active:scale-[0.98]'}`}
                                    >
                                        {isCreating ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Creating...
                                            </>
                                        ) : (
                                            'Create Group'
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-10">
                                <h2 className="text-3xl font-black text-slate-900 mb-2">My Groups</h2>
                                <p className="text-slate-500">Access and manage your secure document groups.</p>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groups.map((group) => (
                                        <Link
                                            key={group.id}
                                            to={`/group/${group.id}`}
                                            className="group block relative bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 border border-slate-100 transition-all duration-300 transform hover:-translate-y-1"
                                        >
                                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 text-2xl font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                                                {group.name.charAt(0).toUpperCase()}
                                            </div>
                                            <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors truncate">{group.name}</h4>
                                            <p className="text-sm text-slate-500 line-clamp-2 mb-6 h-10">{group.description}</p>

                                            <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                                    {group.members ? group.members.length : 1} Members
                                                </span>
                                                {/* Delete Button (Admin Only) */}
                                                {currentUser?.email === 'tandelvansh0511@gmail.com' && (
                                                    <button
                                                        onClick={(e) => deleteGroup(group.id, e)}
                                                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Group"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                    {groups.length === 0 && (
                                        <div className="col-span-full py-20 text-center">
                                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900">No groups found</h3>
                                            <p className="text-slate-500">You haven't joined any groups yet.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
