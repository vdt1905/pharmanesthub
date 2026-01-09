import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import React from 'react';
import logo from '../assets/logo.jpg';
import ThemeToggle from '../components/ThemeToggle';

const Dashboard = () => {
    const [groups, setGroups] = useState([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [newGroupYear, setNewGroupYear] = useState('');
    const [newGroupSemester, setNewGroupSemester] = useState('1');
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const { currentUser } = useAuth();
    const [activeView, setActiveView] = useState('groups');
    const [selectedSemester, setSelectedSemester] = useState(null);
    const location = useLocation(); // Hook to access navigation state
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

    // Check for edit request from navigation
    useEffect(() => {
        if (location.state?.editGroup) {
            const group = location.state.editGroup;
            setEditingGroup(group);
            setNewGroupName(group.name);
            setNewGroupDescription(group.description);
            setNewGroupYear(group.year);
            setNewGroupSemester(group.semester || '1');
            setActiveView('create_group');
            // Clear state to prevent reopening on refresh (optional, but good practice)
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

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

    const handleEditClick = (group, e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingGroup(group);
        setNewGroupName(group.name);
        setNewGroupDescription(group.description);
        setNewGroupYear(group.year);
        setNewGroupSemester(group.semester || '1');
        setActiveView('create_group');
    };

    const createGroup = async (e) => {
        e.preventDefault();
        if (isCreating) return;

        setIsCreating(true);
        try {
            const token = await currentUser.getIdToken();
            const payload = {
                name: newGroupName,
                description: newGroupDescription,
                year: newGroupYear,
                semester: newGroupSemester
            };

            if (editingGroup) {
                await axios.put(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${editingGroup.id}`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } else {
                await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/create`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            setNewGroupName('');
            setNewGroupDescription('');
            setNewGroupYear('');
            setNewGroupSemester('1');
            setEditingGroup(null); // Reset editing state
            fetchGroups();
            setActiveView('groups');
        } catch (error) {
            console.error('Error saving group:', error);
            alert('Failed to save group');
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

    const filteredGroups = selectedSemester
        ? groups.filter(g => (g.semester || '1') === selectedSemester)
        : [];

    return (
        <div className="min-h-screen bg-main flex relative text-primary font-sans selection:bg-indigo-500/30 transition-colors duration-300">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && window.innerWidth < 768 && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 glass-panel border-r-0 transition-all duration-300 flex flex-col
                ${isSidebarOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'}
                h-full
            `}>
                <div className="h-20 flex items-center justify-center border-b border-white/5 mx-4 mb-2">
                    {isSidebarOpen ? (
                        <div className="flex items-center gap-3 animate-fade-in-down">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 blur-md opacity-40 rounded-full"></div>
                                <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg relative z-10 border border-white/10" />
                            </div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight">PharmaNest</h1>
                        </div>
                    ) : (
                        <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg border border-white/10" />
                    )}
                </div>

                <div className="flex-1 py-6 flex flex-col gap-2 px-3">
                    <button
                        onClick={() => { setActiveView('groups'); setSelectedSemester(null); setEditingGroup(null); setNewGroupName(''); setNewGroupDescription(''); setNewGroupYear(''); setNewGroupSemester('1'); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${activeView === 'groups' ? 'bg-indigo-600/20 text-indigo-400 shadow-inner border border-indigo-500/20' : 'text-secondary hover:bg-white/5 hover:text-primary hover:translate-x-1'}`}
                        title="My Groups"
                    >
                        <svg className={`w-5 h-5 shrink-0 transition-colors ${activeView === 'groups' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        {isSidebarOpen && <span className="font-medium">My Groups</span>}
                    </button>

                    {/* Add Group (Admin Only) */}
                    {(currentUser?.email === '@pharmanesthubgmail.com' || currentUser?.email === 'tandelvansh0511@gmail.com') && (
                        <button
                            onClick={() => { setActiveView('create_group'); setEditingGroup(null); setNewGroupName(''); setNewGroupDescription(''); setNewGroupYear(''); setNewGroupSemester('1'); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${activeView === 'create_group' ? 'bg-indigo-600/20 text-indigo-400 shadow-inner border border-indigo-500/20' : 'text-secondary hover:bg-white/5 hover:text-primary hover:translate-x-1'}`}
                            title="Add Group"
                        >
                            <svg className={`w-5 h-5 shrink-0 transition-colors ${activeView === 'create_group' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            {isSidebarOpen && <span className="font-medium">Add Group</span>}
                        </button>
                    )}

                    <div className="mt-auto">
                        <Link
                            to="/help"
                            onClick={() => { if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-secondary hover:bg-white/5 hover:text-primary transition-all hover:translate-x-1 group"
                            title="Help & Doubts"
                        >
                            <svg className="w-5 h-5 shrink-0 text-slate-500 group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            {isSidebarOpen && <span className="font-medium">Help & Support</span>}
                        </Link>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 hidden md:block mx-2">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-indigo-400 transition-colors"
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
            <main className={`flex-1 transition-all duration-300 w-full ${isSidebarOpen ? 'md:ml-72' : 'md:ml-20'}`}>
                {/* Header */}
                <header className="glass-panel h-20 sticky top-0 z-30 px-6 md:px-10 flex items-center justify-between md:justify-end border-x-0 border-t-0 border-b border-white/5">
                    <div className="flex items-center md:hidden">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-secondary hover:text-primary p-2 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                        <span className="ml-3 font-bold text-lg text-primary tracking-wide">PharmaNestHub</span>
                    </div>

                    <div className="flex items-center space-x-2 md:space-x-6">
                        <ThemeToggle />

                        <div className="w-px h-8 bg-white/10 hidden md:block"></div>

                        <Link to="/profile" className="flex items-center group">
                            <div className="text-right mr-3 hidden md:block">
                                <div className="text-sm font-semibold text-primary group-hover:text-indigo-400 transition-colors">{currentUser?.displayName || 'User'}</div>
                                <div className="text-xs text-secondary">{currentUser?.email}</div>
                            </div>
                            <div className="relative shrink-0">
                                {currentUser?.photoURL ? (
                                    <img src={currentUser.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-indigo-500/30 group-hover:border-indigo-400 transition-colors object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white border-2 border-indigo-500/30 shadow-lg shadow-indigo-500/20">
                                        {currentUser?.email?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                            </div>
                        </Link>
                        <div className="w-px h-8 bg-white/10 mx-1 md:mx-2"></div>
                        <button
                            onClick={() => auth.signOut()}
                            className="text-secondary hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                            title="Sign Out"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        </button>
                    </div>
                </header>

                <div className="p-4 md:p-10 max-w-7xl mx-auto">
                    {activeView === 'create_group' && (currentUser?.email === '@pharmanesthubgmail.com' || currentUser?.email === 'tandelvansh0511@gmail.com') ? (
                        <div className="max-w-2xl mx-auto animate-fade-in-up">
                            <h2 className="text-3xl font-bold text-primary mb-8 flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                </div>
                                {editingGroup ? 'Edit Group' : 'Create New Group'}
                            </h2>
                            <div className="glass-card p-8 shadow-2xl shadow-black/20">
                                <form onSubmit={createGroup} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-secondary mb-2 uppercase tracking-wider">Group Name</label>
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            placeholder="e.g. Project Alpha"
                                            className="input-field w-full"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-secondary mb-2 uppercase tracking-wider">Description</label>
                                        <textarea
                                            value={newGroupDescription}
                                            onChange={(e) => setNewGroupDescription(e.target.value)}
                                            placeholder="What is this group for?"
                                            className="input-field w-full resize-none h-32"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-secondary mb-2 uppercase tracking-wider">Target Year</label>
                                            <input
                                                type="text"
                                                value={newGroupYear}
                                                onChange={(e) => setNewGroupYear(e.target.value)}
                                                placeholder="e.g. 1st Year, 2024"
                                                className="input-field w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-secondary mb-2 uppercase tracking-wider">Semester</label>
                                            <select
                                                value={newGroupSemester}
                                                onChange={(e) => setNewGroupSemester(e.target.value)}
                                                className="input-field w-full"
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                                    <option key={num} value={num}>Semester {num}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className={`w-full btn-primary flex items-center justify-center py-4 text-lg ${isCreating ? 'opacity-75 cursor-not-allowed' : ''}`}
                                    >
                                        {isCreating ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                {editingGroup ? 'Updating...' : 'Creating...'}
                                            </>
                                        ) : (
                                            editingGroup ? 'Update Group' : 'Create Group'
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-10 animate-fade-in-down flex items-center justify-between">
                                <div>
                                    <h2 className="text-4xl font-bold text-primary mb-2 tracking-tight">
                                        {selectedSemester ? `Semester ${selectedSemester} Groups` : 'Select Your Semesters'}
                                    </h2>
                                    <p className="text-secondary text-lg">
                                        {selectedSemester ? 'View and manage groups for this semester.' : 'Choose a semester to view your groups.'}
                                    </p>
                                </div>
                                {selectedSemester && (
                                    <button
                                        onClick={() => setSelectedSemester(null)}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-secondary hover:text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                                        Back to Semesters
                                    </button>
                                )}
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-32">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-6 h-6 bg-indigo-500 rounded-full opacity-20 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            ) : !selectedSemester ? (
                                // Semester Selection View
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                        <button
                                            key={sem}
                                            onClick={() => setSelectedSemester(String(sem))}
                                            className="glass-card group p-8 flex flex-col items-center justify-center gap-4 hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 transition-colors duration-500"></div>
                                            <div className="w-20 h-20 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 flex items-center justify-center text-3xl font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors border-4 border-indigo-500/10 group-hover:border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                                                {sem}
                                            </div>
                                            <h3 className="text-xl font-bold text-primary group-hover:text-indigo-300 transition-colors">Semester {sem}</h3>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                // Group List View (Filtered)
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredGroups.map((group, index) => (
                                        <Link
                                            key={group.id}
                                            to={`/group/${group.id}`}
                                            className="glass-card p-6 group block relative hover:-translate-y-2 anim-delay"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                            <div className="relative">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                                                        {group.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    {group.isNew && <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30">NEW</span>}
                                                </div>

                                                <h4 className="text-xl font-bold text-primary mb-2 group-hover:text-indigo-400 transition-colors truncate">{group.name}</h4>
                                                <p className="text-sm text-secondary line-clamp-2 mb-6 h-10 leading-relaxed">{group.description}</p>

                                                {/* Semester Tag */}
                                                <div className="mb-4">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                                                        Semester {group.semester || 1}
                                                    </span>
                                                </div>

                                                <div className="pt-4 border-t border-white/5 flex justify-between items-center text-sm">
                                                    <span className="flex items-center gap-2 text-secondary bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                                        {group.members ? group.members.length : 1}
                                                    </span>
                                                    {(currentUser?.email === '@pharmanesthubgmail.com' || currentUser?.email === 'tandelvansh0511@gmail.com') && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={(e) => handleEditClick(group, e)}
                                                                className="text-slate-500 hover:text-amber-400 p-2 hover:bg-amber-500/10 rounded-lg transition-colors z-20 relative"
                                                                title="Edit Group"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                            </button>
                                                            <button
                                                                onClick={(e) => deleteGroup(group.id, e)}
                                                                className="text-slate-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors z-20 relative"
                                                                title="Delete Group"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                    {filteredGroups.length === 0 && (
                                        <div className="col-span-full py-20 text-center glass-panel rounded-3xl border-dashed border-2 border-slate-700/50">
                                            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                                            </div>
                                            <h3 className="text-lg font-bold text-primary mb-1">No groups in Semester {selectedSemester}</h3>
                                            <p className="text-secondary text-sm">There are no groups here yet.</p>
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
