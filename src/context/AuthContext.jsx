import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';

const { ipcRenderer } = globalThis.require('electron');

const ADMIN_USERNAME = 'Administrator';
const DEFAULT_ADMIN_PW = 'Password123';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const loadUsers = async () => {
    const data = await ipcRenderer.invoke('get-data', 'users');
    return Array.isArray(data) ? data : [];
};

const saveUsers = (users) => {
    ipcRenderer.send('save-data', 'users', users);
};

export const getUserStatus = (user) => {
    if (!user.isActive) return 'deactivated';
    const now = new Date();
    if (user.deactivationDate && new Date(user.deactivationDate) <= now) return 'deactivated';
    if (user.expiryDate && new Date(user.expiryDate) <= now) return 'expired';
    return 'active';
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = sessionStorage.getItem('auth_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [users, setUsers] = useState([]);

    // Admin password is persisted in electron-store; use a ref so login() always
    // reads the latest value without stale-closure issues.
    const adminPwRef = useRef(DEFAULT_ADMIN_PW);

    useEffect(() => {
        loadUsers().then(setUsers);
        ipcRenderer.invoke('get-data', 'adminPassword').then((pw) => {
            if (pw) adminPwRef.current = pw;
        });
    }, []);

    const persistSession = (user) => {
        if (user) {
            sessionStorage.setItem('auth_user', JSON.stringify(user));
        } else {
            sessionStorage.removeItem('auth_user');
        }
    };

    const makeAdminUser = () => ({
        id: 'administrator',
        username: ADMIN_USERNAME,
        isAdmin: true,
        isActive: true,
        expiryDate: null,
        deactivationDate: null,
    });

    const login = async (username, password) => {
        if (username === ADMIN_USERNAME && password === adminPwRef.current) {
            const admin = makeAdminUser();
            setCurrentUser(admin);
            persistSession(admin);
            return { success: true };
        }

        const allUsers = await loadUsers();
        setUsers(allUsers);

        const user = allUsers.find(
            (u) => u.username.toLowerCase() === username.toLowerCase()
        );

        if (!user || user.password !== password) {
            return { success: false, error: 'Invalid username or password.' };
        }

        const status = getUserStatus(user);
        if (status === 'deactivated') {
            return { success: false, error: 'Your account has been deactivated. Contact the administrator.' };
        }
        if (status === 'expired') {
            return { success: false, error: 'Your account has expired. Contact the administrator.' };
        }

        setCurrentUser(user);
        persistSession(user);
        return { success: true };
    };

    const logout = () => {
        setCurrentUser(null);
        persistSession(null);
    };

    const changeAdminPassword = (currentPassword, newPassword) => {
        if (currentPassword !== adminPwRef.current) {
            return { success: false, error: 'Current password is incorrect.' };
        }
        if (newPassword.length < 6) {
            return { success: false, error: 'New password must be at least 6 characters.' };
        }
        adminPwRef.current = newPassword;
        ipcRenderer.send('save-data', 'adminPassword', newPassword);
        return { success: true };
    };

    const createUser = ({ username, email, name, password, expiryDate, deactivationDate }) => {
        const newUser = {
            id: Date.now().toString(),
            username,
            email:            email || null,
            name:             name  || null,
            password,
            isAdmin:          false,
            isActive:         true,
            createdAt:        new Date().toISOString(),
            expiryDate:       expiryDate       || null,
            deactivationDate: deactivationDate || null,
        };
        const updated = [...users, newUser];
        setUsers(updated);
        saveUsers(updated);
        return newUser;
    };

    const createUsers = (list) => {
        const now = new Date().toISOString();
        const newUsers = list.map((u, i) => ({
            id: (Date.now() + i).toString(),
            username:         u.username,
            email:            u.email            || null,
            name:             u.name             || null,
            password:         u.password,
            isAdmin:          false,
            isActive:         true,
            createdAt:        now,
            expiryDate:       u.expiryDate       || null,
            deactivationDate: u.deactivationDate || null,
        }));
        const updated = [...users, ...newUsers];
        setUsers(updated);
        saveUsers(updated);
        return newUsers;
    };

    const updateOwnProfile = (updates) => {
        if (!currentUser || currentUser.isAdmin) {
            return { success: false, error: 'Not available for this account.' };
        }
        updateUser(currentUser.id, updates);
        const updated = { ...currentUser, ...updates };
        setCurrentUser(updated);
        persistSession(updated);
        return { success: true };
    };

    const updateUser = (id, updates) => {
        const updated = users.map((u) => (u.id === id ? { ...u, ...updates } : u));
        setUsers(updated);
        saveUsers(updated);
    };

    const deleteUser = (id) => {
        const updated = users.filter((u) => u.id !== id);
        setUsers(updated);
        saveUsers(updated);
    };

    const resetUserPassword = (id, newPassword) => {
        updateUser(id, { password: newPassword });
    };

    const changeOwnPassword = (currentPassword, newPassword) => {
        if (!currentUser || currentUser.isAdmin) {
            return { success: false, error: 'Not available for this account.' };
        }
        if (currentUser.password !== currentPassword) {
            return { success: false, error: 'Current password is incorrect.' };
        }
        updateUser(currentUser.id, { password: newPassword });
        const updated = { ...currentUser, password: newPassword };
        setCurrentUser(updated);
        persistSession(updated);
        return { success: true };
    };

    const changeOwnUsername = (newUsername) => {
        if (!currentUser || currentUser.isAdmin) {
            return { success: false, error: 'Not available for this account.' };
        }
        const exists = users.some(
            (u) => u.id !== currentUser.id && u.username.toLowerCase() === newUsername.toLowerCase()
        );
        if (exists) {
            return { success: false, error: 'That username is already taken.' };
        }
        updateUser(currentUser.id, { username: newUsername });
        const updated = { ...currentUser, username: newUsername };
        setCurrentUser(updated);
        persistSession(updated);
        return { success: true };
    };

    const value = useMemo(
        () => ({
            currentUser,
            isAdmin: currentUser?.isAdmin || false,
            users,
            getUserStatus,
            login,
            logout,
            changeAdminPassword,
            createUser,
            createUsers,
            updateUser,
            deleteUser,
            resetUserPassword,
            changeOwnPassword,
            changeOwnUsername,
            updateOwnProfile,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [currentUser, users]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
