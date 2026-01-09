import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import React from 'react';
import logo from '../assets/logo.jpg';
import ThemeToggle from '../components/ThemeToggle';

const GroupView = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
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
    const [inviteKey, setInviteKey] = useState(0);
    const [generatedDuration, setGeneratedDuration] = useState(null);
    const [generatingInvite, setGeneratingInvite] = useState(false);

    // New state for members
    const [members, setMembers] = useState([]);
    const [showMembers, setShowMembers] = useState(false);
    const [removingMember, setRemovingMember] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        if (currentUser) {
            Promise.all([fetchGroupData(), fetchMembers()]).finally(() => {
                setInitialLoading(false);
            });
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
            const groupRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${groupId}`, config);
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
            const pdfRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/pdfs/${groupId}`, config);
            setPdfs(pdfRes.data);
        } catch (error) {
            console.error('Error fetching data', error);
        }
    };

    const fetchMembers = async () => {
        try {
            const token = await currentUser.getIdToken();
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${groupId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(res.data);
        } catch (error) {
            console.error('Error fetching members', error);
        }
    };

    const deleteGroup = async () => {
        if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;

        try {
            const token = await currentUser.getIdToken();
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${groupId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Group deleted successfully');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error deleting group:', error);
            alert('Failed to delete group');
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm('Are you sure you want to remove this member from the group?')) return;

        setRemovingMember(memberId);
        try {
            const token = await currentUser.getIdToken();
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${groupId}/members/${memberId}`, {
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
        setGeneratingInvite(true);
        try {
            const token = await currentUser.getIdToken();
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${groupId}/invite`,
                { durationDays: inviteDuration },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('Invite Gen Response:', res.data);
            const link = `${window.location.origin}/join/${res.data.inviteCode}`;
            setInviteLink(link);
            setGeneratedDuration(inviteDuration);
            setInviteKey(prev => prev + 1);
        } catch (error) {
            console.error('Invite generation failed', error);
            alert('Failed to generate invite link');
        } finally {
            setGeneratingInvite(false);
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
            await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/pdfs/upload`, formData, {
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
            case 'owner': return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
            case 'admin': return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
            default: return 'bg-slate-800/50 text-slate-400 border-slate-700/50';
        }
    };

    if (initialLoading) {
        return (
            <div className="min-h-screen bg-main flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300">
                {/* Ambient Background */}
                <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 opacity-50 dark:opacity-100 transition-opacity">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] animate-pulse-slow"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className="flex flex-col items-center gap-6 animate-fade-in-up">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse-slow"></div>
                        <img src={logo} alt="Logo" className="w-20 h-20 rounded-2xl object-cover shadow-2xl relative z-10 border border-white/10" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                        <h2 className="text-xl font-bold text-primary tracking-tight">Loading Group Data...</h2>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-main flex flex-col relative overflow-hidden text-primary selection:bg-indigo-500/30 transition-colors duration-300">
            {/* Ambient Background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 opacity-50 dark:opacity-100 transition-opacity">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Navbar */}
            <nav className="glass-panel sticky top-0 z-50 border-x-0 border-t-0 border-b border-white/5 h-auto md:h-20 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-0 h-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-0">
                    <div className="flex items-center gap-3 md:gap-6 min-w-0">
                        <Link to="/dashboard" className="p-2 -ml-2 text-secondary hover:text-primary transition-colors hover:bg-white/5 rounded-xl shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        </Link>

                        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                            <div className="relative shrink-0">
                                <div className="absolute inset-0 bg-indigo-500 blur opacity-40 rounded-xl"></div>
                                <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg relative z-10 border border-white/10" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg font-bold text-primary leading-tight break-words whitespace-normal">{group?.name || 'Loading...'}</h1>
                                {group?.creatorName && (
                                    <p className="text-xs text-secondary font-medium">by {group.creatorName}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto pl-10 md:pl-0">
                        <ThemeToggle />

                        {isAdmin && (
                            <button
                                onClick={() => setShowMembers(!showMembers)}
                                className={`px-3 py-1.5 md:py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${showMembers ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/25' : 'bg-white/5 text-secondary hover:bg-white/10'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                <span>Members</span>
                                <span className="bg-black/20 px-1.5 py-0.5 rounded-md text-xs">{members.length}</span>
                            </button>
                        )}

                        {isAdmin && (
                            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1 border border-white/5">
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={inviteDuration}
                                    onChange={(e) => setInviteDuration(e.target.value)}
                                    className="w-10 md:w-12 bg-transparent text-center text-sm font-bold text-primary outline-none border-b-2 border-transparent focus:border-indigo-500 transition-colors"
                                />
                                <span className="text-xs text-secondary font-medium pr-1">days</span>
                                <button
                                    onClick={generateInvite}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-md shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                    <span>Invite</span>
                                </button>
                            </div>
                        )}

                        {(currentUser?.email === '@pharmanesthubgmail.com' || currentUser?.email === 'tandelvansh0511@gmail.com') && (
                            <button
                                onClick={deleteGroup}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                                title="Delete Group"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-4 md:p-8 w-full animate-fade-in-up">
                {/* Invite Notification */}
                {(inviteLink || generatingInvite) && (
                    <div key={inviteKey} className="mb-8 animate-fade-in-down">
                        <div className="glass-panel p-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 ${generatingInvite ? 'animate-pulse' : ''}`}>
                                        {generatingInvite ? (
                                            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        ) : (
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{generatingInvite ? 'Generating Link...' : 'Invite Link Created'}</h3>
                                        <p className="text-sm text-secondary">
                                            {generatingInvite ? 'Please wait a moment' : <>Valid for <span className="text-emerald-400 font-bold">{generatedDuration} days</span></>}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex w-full md:w-auto bg-black/20 rounded-xl p-1 border border-white/5">
                                    <code className="flex-1 md:flex-none px-3 py-2 text-xs font-mono text-emerald-300 truncate max-w-[200px] md:max-w-xs bg-transparent min-w-[200px]">
                                        {generatingInvite ? '...' : inviteLink}
                                    </code>
                                    <button
                                        onClick={() => { if (!generatingInvite) { navigator.clipboard.writeText(inviteLink); alert('Copied!'); } }}
                                        disabled={generatingInvite}
                                        className={`px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors ${generatingInvite ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {generatingInvite ? '...' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`grid grid-cols-1 gap-6 lg:gap-8 ${showMembers ? 'xl:grid-cols-12' : 'xl:grid-cols-4'}`}>
                    {/* Left Sidebar */}
                    <div className={`space-y-6 ${showMembers ? 'xl:col-span-3' : 'xl:col-span-1'}`}>
                        {/* Info Card */}
                        <div className="glass-card p-6">
                            <h2 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">About Group</h2>
                            <p className="text-primary text-sm leading-relaxed">{group?.description || 'No description available.'}</p>

                            {group?.year && (
                                <div className="mt-4">
                                    <span className="inline-block px-2 py-1 bg-white/5 border border-white/10 rounded text-xs font-medium text-secondary">
                                        {group.year}
                                    </span>
                                </div>
                            )}

                            {/* Countdown */}
                            {expiry && !isAdmin && (
                                <div className="mt-6 relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/20 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-wider">Access Expires In</span>
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                    </div>
                                    <div className="text-2xl font-mono font-bold text-white tracking-tight">{timeLeft}</div>
                                </div>
                            )}

                            {isAdmin && (
                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                        <div className="text-xs text-secondary font-bold uppercase mb-1">Files</div>
                                        <div className="text-2xl font-bold text-primary">{pdfs.length}</div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                        <div className="text-xs text-secondary font-bold uppercase mb-1">Members</div>
                                        <div className="text-2xl font-bold text-primary">{members.length}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Upload Card */}
                        {isAdmin && (
                            <div className="glass-card p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -z-10"></div>
                                <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
                                    <span className="p-1.5 bg-indigo-600 rounded-lg">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                    </span>
                                    Upload Document
                                </h3>
                                <form onSubmit={handleUpload} className="space-y-4">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        required
                                        placeholder="Document Title"
                                        className="input-field w-full"
                                    />
                                    <label className="block w-full cursor-pointer group">
                                        <div className="w-full h-24 border-2 border-dashed border-slate-700/50 rounded-xl flex flex-col items-center justify-center bg-white/5 group-hover:bg-white/10 group-hover:border-indigo-500/50 transition-all">
                                            {file ? (
                                                <div className="text-center px-4">
                                                    <div className="text-green-400 mb-1">
                                                        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                    </div>
                                                    <p className="text-xs font-bold text-primary truncate max-w-[150px]">{file.name}</p>
                                                </div>
                                            ) : (
                                                <div className="text-center text-secondary group-hover:text-indigo-400 transition-colors">
                                                    <span className="text-xs font-bold">Choose PDF</span>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" className="hidden" accept="application/pdf" onChange={e => setFile(e.target.files[0])} />
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="w-full btn-primary py-3 text-sm flex items-center justify-center disabled:opacity-50"
                                    >
                                        {uploading ? 'Uploading...' : 'Upload Securely'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Main Content: Files */}
                    <div className={showMembers ? 'xl:col-span-6' : 'xl:col-span-3'}>
                        <div className="mb-6 flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-primary">Secure Documents</h2>
                            <div className="h-px flex-1 bg-white/5"></div>
                        </div>

                        {pdfs.length > 0 ? (
                            <div className={`grid grid-cols-1 gap-4 ${showMembers ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                                {pdfs.map((pdf, index) => (
                                    <div
                                        key={pdf.id}
                                        className="glass-card p-5 group flex flex-col h-full hover:-translate-y-1 anim-delay"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-white/5 text-secondary border border-white/5">
                                                {new Date(pdf.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-primary text-lg mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                                            {pdf.title}
                                        </h3>

                                        <div className="mt-auto pt-4">
                                            <Link
                                                to={`/view/${groupId}/${pdf.id}`}
                                                className="w-full py-2.5 bg-white/5 hover:bg-indigo-600 text-secondary hover:text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-all group/btn border border-white/5 hover:border-indigo-500/50"
                                            >
                                                <span>View Securely</span>
                                                <svg className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-panel rounded-3xl p-12 text-center border-dashed border-2 border-slate-700/50">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-secondary">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l4 4a1 1 0 01.586 1.414V19a2 2 0 01-2 2z"></path></svg>
                                </div>
                                <h3 className="text-lg font-bold text-primary mb-2">No documents yet</h3>
                                <p className="text-secondary text-sm">This group doesn't have any secure files shared yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Members List */}
                    {showMembers && (
                        <div className="xl:col-span-3">
                            <div className="glass-panel rounded-2xl p-4 sticky top-28 max-h-[calc(100vh-140px)] flex flex-col">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">Members</h3>
                                    <span className="text-xs font-bold text-primary bg-white/10 px-2 py-0.5 rounded">{members.length}</span>
                                </div>

                                <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar flex-1">
                                    {members.map((member) => (
                                        <div key={member.uid} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {member.photoUrl ? (
                                                    <img src={member.photoUrl} alt={member.name} className="w-full h-full rounded-lg object-cover" />
                                                ) : (
                                                    member.name?.charAt(0).toUpperCase() || '?'
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-semibold text-primary truncate">{member.name}</p>
                                                    <span className={`text-[10px] font-bold px-1.5 rounded border uppercase ${getRoleBadgeColor(member.role)}`}>
                                                        {member.role === 'owner' ? 'Own' : member.role === 'admin' ? 'Adm' : 'Mem'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-secondary truncate">{member.email}</p>
                                            </div>
                                            {isAdmin && member.role !== 'owner' && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.uid)}
                                                    className="text-secondary hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupView;
