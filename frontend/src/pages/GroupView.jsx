import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import React from 'react';

const GroupView = () => {
    const { groupId } = useParams();
    const [pdfs, setPdfs] = useState([]);
    const [group, setGroup] = useState(null);
    const [inviteLink, setInviteLink] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const { currentUser } = useAuth();

    const [inviteDuration, setInviteDuration] = useState(30);
    const [expiry, setExpiry] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');

    // New state for members
    const [members, setMembers] = useState([]);
    const [showMembers, setShowMembers] = useState(false);
    const [removingMember, setRemovingMember] = useState(null);

    useEffect(() => {
        if (currentUser) {
            fetchGroupData();
            fetchMembers();
        }
    }, [groupId, currentUser]);

    // Countdown Timer logic
    useEffect(() => {
        if (!expiry) return;
        const interval = setInterval(() => {
            const now = new Date();
            const end = new Date(expiry);
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('Expired');
                clearInterval(interval);
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`${days}d ${hours}h ${minutes}m`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [expiry]);

    const fetchGroupData = async () => {
        try {
            const token = await currentUser.getIdToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Fetch Group Details
            const groupRes = await axios.get(`http://localhost:5000/api/groups/${groupId}`, config);
            setGroup(groupRes.data);

            // Check Admin Status
            const g = groupRes.data;
            let checkAdmin = false;
            if (g.roles && (g.roles[currentUser.uid] === 'owner' || g.roles[currentUser.uid] === 'admin')) {
                checkAdmin = true;
            } else if (g.createdBy === currentUser.uid) {
                checkAdmin = true;
            }
            setIsAdmin(checkAdmin);

            // Check Expiry
            if (g.memberExpiry && g.memberExpiry[currentUser.uid]) {
                setExpiry(g.memberExpiry[currentUser.uid]);
            }

            // Fetch PDFs
            const pdfRes = await axios.get(`http://localhost:5000/api/pdfs/${groupId}`, config);
            setPdfs(pdfRes.data);
        } catch (error) {
            console.error('Error fetching data', error);
        }
    };

    const fetchMembers = async () => {
        try {
            const token = await currentUser.getIdToken();
            const res = await axios.get(`http://localhost:5000/api/groups/${groupId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(res.data);
        } catch (error) {
            console.error('Error fetching members', error);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm('Are you sure you want to remove this member from the group?')) return;

        setRemovingMember(memberId);
        try {
            const token = await currentUser.getIdToken();
            await axios.delete(`http://localhost:5000/api/groups/${groupId}/members/${memberId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Refresh members list
            setMembers(prev => prev.filter(m => m.uid !== memberId));
        } catch (error) {
            console.error('Error removing member', error);
            alert(error.response?.data?.message || 'Failed to remove member');
        } finally {
            setRemovingMember(null);
        }
    };

    const generateInvite = async () => {
        try {
            const token = await currentUser.getIdToken();
            const res = await axios.post(`http://localhost:5000/api/groups/${groupId}/invite`,
                { durationDays: inviteDuration },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('Invite Gen Response:', res.data);
            const link = `${window.location.origin}/join/${res.data.inviteCode}`;
            setInviteLink(link);
        } catch (error) {
            console.error('Invite generation failed', error);
            alert('Failed to generate invite link');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);

        const formData = new FormData();
        formData.append('pdf', file);
        formData.append('title', title);
        formData.append('groupId', groupId);

        try {
            const token = await currentUser.getIdToken();
            await axios.post('http://localhost:5000/api/pdfs/upload', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setTitle('');
            setFile(null);
            fetchGroupData();
        } catch (error) {
            console.error('Upload failed', error);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'owner': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
            {/* Ambient Animated Background */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-purple-500/10 rounded-full blur-[100px] animate-float"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-indigo-500/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-[30%] right-[20%] w-[30vh] h-[30vh] bg-teal-400/10 rounded-full blur-[80px] animate-pulse-slow"></div>
            </div>

            {/* Navbar */}
            <nav className="bg-white/70 backdrop-blur-xl border-b border-white/40 sticky top-0 z-50 transition-all duration-300 shadow-sm">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between h-auto md:h-20 py-4 md:py-0 items-center gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <Link to="/dashboard" className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 transition-all active:scale-95">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            </Link>
                            <div className="h-8 w-px bg-slate-200/60 hidden md:block"></div>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/20 shrink-0">
                                    {group?.name?.charAt(0).toUpperCase() || 'G'}
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg font-bold text-slate-900 leading-tight truncate">
                                        {group?.name || 'Loading...'}
                                    </h1>
                                    {group?.creatorName && (
                                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1 truncate">
                                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                                            by {group.creatorName}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Action Bar */}
                        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                            {/* Members Toggle Button (Admin Only) */}
                            {isAdmin && (
                                <button
                                    onClick={() => setShowMembers(!showMembers)}
                                    className={`px-4 py-2 text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 ${showMembers
                                        ? 'bg-indigo-600 text-white shadow-indigo-500/25'
                                        : 'bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-white border border-slate-200'
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                    </svg>
                                    <span className="hidden sm:inline">Members</span>
                                    <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-md font-bold">
                                        {members.length}
                                    </span>
                                </button>
                            )}

                            {isAdmin && (
                                <>
                                    <div className="flex items-center bg-white/50 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-slate-200 shadow-sm">
                                        <span className="text-[10px] md:text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">Validity</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={inviteDuration}
                                            onChange={(e) => setInviteDuration(e.target.value)}
                                            className="w-10 md:w-12 bg-transparent text-sm font-bold text-slate-800 outline-none text-center border-b-2 border-transparent focus:border-indigo-500 transition-colors"
                                        />
                                        <span className="ml-1 text-xs font-medium text-slate-500">days</span>
                                    </div>
                                    <button
                                        onClick={generateInvite}
                                        className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-slate-900/25 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 group whitespace-nowrap"
                                    >
                                        <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                        <span className="hidden sm:inline">New Link</span>
                                        <span className="sm:hidden">Invite</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-[1800px] mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in-up">
                {/* Invite Link Notification Overlay */}
                {inviteLink && (
                    <div className="mb-8 animate-fade-in-down">
                        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 p-4 md:p-5 rounded-2xl shadow-xl shadow-teal-500/5 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-teal-900">Unique Invite Created</h3>
                                    <p className="text-sm text-teal-700/80 font-medium">This link is valid for <span className="font-bold underline Decoration-teal-500/50">{inviteDuration} days</span>.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto bg-white p-1 rounded-xl border border-teal-200 shadow-sm">
                                <code className="flex-1 md:flex-none py-2 px-3 bg-transparent text-xs font-mono text-teal-800 break-all md:break-normal truncate max-w-[200px] md:max-w-xs">
                                    {inviteLink}
                                </code>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(inviteLink); alert('Copied!') }}
                                    className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm transition-colors font-bold text-xs shrink-0"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`grid grid-cols-1 gap-6 lg:gap-8 ${showMembers ? 'xl:grid-cols-12' : 'xl:grid-cols-4'}`}>
                    {/* Left Sidebar: Info & Upload */}
                    <div className={`space-y-6 ${showMembers ? 'xl:col-span-3' : 'xl:col-span-1'}`}>
                        {/* Group Description Card */}
                        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl shadow-slate-200/40">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                About Group
                            </h2>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                {group?.description || 'No description available for this group.'}
                            </p>

                            {/* Membership Countdown */}
                            {expiry && !isAdmin && (
                                <div className="mt-8 relative overflow-hidden group rounded-2xl">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-100 transition-opacity"></div>
                                    <div className="relative p-5 text-white">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold opacity-80 uppercase tracking-wider">Access Time</span>
                                            <svg className="w-5 h-5 opacity-80 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        </div>
                                        <div className="text-3xl font-black tracking-tight font-mono">
                                            {timeLeft}
                                        </div>
                                        <div className="mt-2 text-xs font-medium opacity-70">
                                            Renew before it expires to keep access.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isAdmin && (
                                <div className="mt-8 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Total Files</h3>
                                        <p className="text-2xl font-black text-indigo-900">{pdfs.length}</p>
                                    </div>
                                    <div className="text-indigo-200">
                                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Upload Widget (Admin Only) */}
                        {isAdmin && (
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-[100px] -z-0 group-hover:scale-110 transition-transform duration-500"></div>
                                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 relative z-10">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                    </div>
                                    Upload File
                                </h3>
                                <form onSubmit={handleUpload} className="space-y-4 relative z-10">
                                    <div>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            required
                                            placeholder="Document Title"
                                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm"
                                        />
                                    </div>
                                    <label className="block w-full cursor-pointer group/file">
                                        <div className="w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 group-hover/file:bg-indigo-50/50 group-hover/file:border-indigo-400 transition-all duration-300 relative overflow-hidden">
                                            {file ? (
                                                <div className="text-center px-4 relative z-10">
                                                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{file.name}</p>
                                                </div>
                                            ) : (
                                                <div className="text-center relative z-10">
                                                    <svg className="w-8 h-8 text-slate-400 mb-2 mx-auto group-hover/file:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                                    <p className="text-xs font-bold text-slate-500 group-hover/file:text-indigo-600 transition-colors">Choose PDF</p>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" className="hidden" accept="application/pdf" onChange={e => setFile(e.target.files[0])} />
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                                    >
                                        {uploading ? 'Processing...' : 'Upload Now'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Middle Content: Files Grid */}
                    <div className={showMembers ? 'xl:col-span-6' : 'xl:col-span-3'}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
                                Secure Documents
                            </h2>
                        </div>

                        {pdfs.length > 0 ? (
                            <div className={`grid grid-cols-1 gap-5 ${showMembers ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                                {pdfs.map((pdf, index) => (
                                    <div
                                        key={pdf.id}
                                        className="group relative bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(99,102,241,0.2)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>
                                            </div>
                                            {/* External link removed for security */}
                                            <div className="p-2 text-slate-200" title="Protected">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                            </div>
                                        </div>

                                        <div className="flex-1 mb-6">
                                            <h3 className="font-bold text-slate-900 text-lg leading-snug mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2" title={pdf.title}>
                                                {pdf.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                                                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-500">PDF</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>{new Date(pdf.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                        </div>

                                        <Link
                                            to={`/view/${groupId}/${pdf.id}`}
                                            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 group-hover:bg-indigo-600 transition-colors shadow-lg shadow-slate-900/10 group-hover:shadow-indigo-500/30 text-sm"
                                        >
                                            <span>View Document</span>
                                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 px-4 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200 hover:border-indigo-200 transition-colors">
                                <div className="w-20 h-20 bg-gradient-to-tr from-slate-100 to-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l4 4a1 1 0 01.586 1.414V19a2 2 0 01-2 2z"></path></svg>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">No documents yet</h3>
                                <p className="text-slate-500 text-center max-w-sm mb-6 text-sm">This group doesn't have any secure files shared yet.</p>
                                {isAdmin && (
                                    <div className="text-indigo-600 font-bold text-xs bg-indigo-50 px-4 py-2 rounded-lg animate-pulse">
                                        Use the upload panel to add files
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar: Members Panel */}
                    {showMembers && (
                        <div className="xl:col-span-3">
                            <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl shadow-slate-200/40 sticky top-28">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                        Group Members
                                    </h2>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                        {members.length}
                                    </span>
                                </div>

                                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                    {members.map((member) => (
                                        <div
                                            key={member.uid}
                                            className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all group"
                                        >
                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                                                {member.photoUrl ? (
                                                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    member.name?.charAt(0).toUpperCase() || '?'
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-900 text-sm truncate">
                                                        {member.name}
                                                    </p>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${getRoleBadgeColor(member.role)}`}>
                                                        {member.role}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {member.email}
                                                </p>
                                                {member.expiryDate && (
                                                    <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                                                        Expires: {new Date(member.expiryDate).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Remove Button (Admin only, not for owner) */}
                                            {isAdmin && member.role !== 'owner' && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.uid)}
                                                    disabled={removingMember === member.uid}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                    title="Remove member"
                                                >
                                                    {removingMember === member.uid ? (
                                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {members.length === 0 && (
                                        <div className="text-center py-8 text-slate-400">
                                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            </svg>
                                            <p className="text-sm font-medium">No members found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default GroupView;
