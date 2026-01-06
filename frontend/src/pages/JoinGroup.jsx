import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import React from 'react';

const JoinGroup = () => {
    const { inviteCode } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [status, setStatus] = useState('Joining...');

    useEffect(() => {
        const join = async () => {
            if (!currentUser) return; // Wait for auth
            try {
                const token = await currentUser.getIdToken();
                const res = await axios.post('http://localhost:5000/api/groups/join',
                    { inviteCode },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setStatus('Joined successfully! Redirecting...');
                setTimeout(() => {
                    navigate(`/group/${res.data.groupId}`);
                }, 1500);
            } catch (error) {
                console.error('Join error', error);
                setStatus('Failed to join group: ' + (error.response?.data?.message || error.message));
            }
        };

        if (currentUser) {
            join();
        } else {
            // Ideally redirect to login with return url, but simple redirect for now
            // User needs to be logged in to join
            setStatus('Please log in to join.');
            setTimeout(() => navigate('/login'), 2000);
        }
    }, [inviteCode, currentUser, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="p-8 bg-white rounded-lg shadow-md text-center">
                <h2 className="text-xl font-bold mb-4">Joining Group</h2>
                <p>{status}</p>
            </div>
        </div>
    );
};

export default JoinGroup;
