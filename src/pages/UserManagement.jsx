import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal, ModalBody, ModalFooter } from '../components/ui/Modal';
import {
    Users, UserPlus, Eye, EyeOff, Pencil, KeyRound,
    Trash2, AlertTriangle, CalendarDays, ShieldCheck, UserX, Clock, Plus, X as XIcon
} from 'lucide-react';
import { cn } from '../utils/cn';
import PropTypes from 'prop-types';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const getExpiryFromRow = (row) => {
    if (row.validityType === 'days') {
        const d = Number(row.validityDays);
        if (d > 0) return new Date(Date.now() + d * 86_400_000).toISOString();
    } else if (row.validityType === 'date' && row.validityDate) {
        return new Date(row.validityDate + 'T23:59:59').toISOString();
    }
    return null;
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        active:      { label: 'Active',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        deactivated: { label: 'Deactivated', cls: 'bg-rose-50    text-rose-700    border-rose-200'    },
        expired:     { label: 'Expired',     cls: 'bg-amber-50   text-amber-700   border-amber-200'   },
    };
    const { label, cls } = map[status] || map.active;
    return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', cls)}>
            {label}
        </span>
    );
};

StatusBadge.propTypes = {
    status: PropTypes.string.isRequired,
};

// ── Password cell ─────────────────────────────────────────────────────────────
const PasswordCell = ({ password }) => {
    const [show, setShow] = useState(false);
    return (
        <span className="flex items-center gap-1.5 font-mono text-xs">
            {show ? password : '••••••••'}
            <button onClick={() => setShow(v => !v)}
                className="text-slate-400 hover:text-indigo-500 transition-colors" title={show ? 'Hide' : 'Reveal'}>
                {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
        </span>
    );
};

PasswordCell.propTypes = {
    password: PropTypes.string.isRequired,
};

// ── Blank batch row ───────────────────────────────────────────────────────────
const blankRow = () => ({
    _id:          Math.random().toString(36).slice(2),
    username:     '',
    email:        '',
    password:     '',
    showPass:     false,
    validityType: 'days',  // 'days' | 'date'
    validityDays: '',
    validityDate: '',
});

// ── Validity toggle pill ──────────────────────────────────────────────────────
const ValidityToggle = ({ row, onChange }) => (
    <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium flex-shrink-0 h-10">
        {['days', 'date'].map(t => (
            <button key={t} type="button"
                onClick={() => onChange({ validityType: t })}
                className={cn('px-3 transition-colors capitalize',
                    row.validityType === t
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50')}>
                {t === 'days' ? '# Days' : 'Date'}
            </button>
        ))}
    </div>
);

ValidityToggle.propTypes = {
    row: PropTypes.shape({
        validityType: PropTypes.string.isRequired,
    }).isRequired,
    onChange: PropTypes.func.isRequired,
};

// ── UserManagement page ───────────────────────────────────────────────────────
const UserManagement = () => {
    const { users, getUserStatus, createUsers, updateUser, deleteUser, resetUserPassword } = useAuth();
    const { toast } = useToast();

    // ── Batch-create state ────────────────────────────────────────────────────
    const [showCreate, setShowCreate]   = useState(false);
    const [rows, setRows]               = useState([blankRow()]);
    const [batchErr, setBatchErr]       = useState('');

    const updateRow = (id, patch) =>
        setRows(prev => prev.map(r => r._id === id ? { ...r, ...patch } : r));
    const removeRow = (id) =>
        setRows(prev => prev.length > 1 ? prev.filter(r => r._id !== id) : prev);

    const validateUserRow = (r, idx, filledRows, existingUsernames) => {
        const label = filledRows.length > 1 ? `Row ${idx + 1}: ` : '';
        if (!r.username.trim()) return `${label}Username is required.`;
        if (!r.password)        return `${label}Password is required.`;
        if (r.password.length < 6) return `${label}Password must be at least 6 characters.`;
        if (r.email && !isValidEmail(r.email)) return `${label}Email is not valid.`;

        const uLower = r.username.trim().toLowerCase();
        if (existingUsernames.has(uLower))
            return `${label}Username "${r.username.trim()}" already exists.`;
        
        const isDuplicateInBatch = filledRows.slice(0, idx).some(prev => 
            prev.username.trim().toLowerCase() === uLower
        );
        if (isDuplicateInBatch)
            return `${label}Username "${r.username.trim()}" is duplicated in this batch.`;
        
        return null;
    };

    const handleBatchCreate = () => {
        setBatchErr('');
        const existingSet = new Set(users.map(u => u.username.toLowerCase()));

        const filledRows = rows.filter(r => r.username.trim() || r.password || r.email.trim());
        if (filledRows.length === 0) {
            setBatchErr('Fill in at least one user row.');
            return;
        }

        for (let i = 0; i < filledRows.length; i++) {
            const error = validateUserRow(filledRows[i], i, filledRows, existingSet);
            if (error) {
                setBatchErr(error);
                return;
            }
        }

        createUsers(filledRows.map(r => ({
            username:         r.username.trim(),
            email:            r.email.trim() || null,
            password:         r.password,
            expiryDate:       getExpiryFromRow(r),
            deactivationDate: null,
        })));

        const count = filledRows.length;
        toast({
            title:       `${count} user${count > 1 ? 's' : ''} created`,
            description: `${count > 1 ? 'They' : 'The user'} can now log in.`,
            type:        'success',
        });
        setShowCreate(false);
        setRows([blankRow()]);
    };

    // ── Edit state ────────────────────────────────────────────────────────────
    const [editUser,     setEditUser]     = useState(null);
    const [editForm,     setEditForm]     = useState({});
    const [editErr,      setEditErr]      = useState('');

    const openEdit = (user) => {
        setEditUser(user);
        setEditForm({
            username:         user.username,
            email:            user.email || '',
            expiryDate:       user.expiryDate        ? user.expiryDate.split('T')[0]        : '',
            deactivationDate: user.deactivationDate  ? user.deactivationDate.split('T')[0]  : '',
            isActive:         user.isActive,
        });
        setEditErr('');
    };

    const handleEdit = () => {
        setEditErr('');
        const { username, email, expiryDate, deactivationDate, isActive } = editForm;
        if (!username.trim()) return setEditErr('Username is required.');
        if (email && !isValidEmail(email)) return setEditErr('Email is not valid.');
        const exists = users.some(
            u => u.id !== editUser.id && u.username.toLowerCase() === username.trim().toLowerCase()
        );
        if (exists) return setEditErr('That username is already taken.');

        updateUser(editUser.id, {
            username:         username.trim(),
            email:            email.trim() || null,
            expiryDate:       expiryDate       || null,
            deactivationDate: deactivationDate || null,
            isActive,
        });
        toast({ title: 'User updated', type: 'success' });
        setEditUser(null);
    };

    // ── Reset-password state ──────────────────────────────────────────────────
    const [resetUser,    setResetUser]    = useState(null);
    const [newPass,      setNewPass]      = useState('');
    const [showNewPass,  setShowNewPass]  = useState(false);
    const [resetErr,     setResetErr]     = useState('');

    const handleReset = () => {
        setResetErr('');
        if (!newPass)           return setResetErr('New password is required.');
        if (newPass.length < 6) return setResetErr('Password must be at least 6 characters.');
        resetUserPassword(resetUser.id, newPass);
        toast({ title: 'Password reset', description: `Password for ${resetUser.username} updated.`, type: 'success' });
        setResetUser(null);
        setNewPass('');
    };

    // ── Delete state ──────────────────────────────────────────────────────────
    const [deleteTarget, setDeleteTarget] = useState(null);

    const handleDelete = () => {
        deleteUser(deleteTarget.id);
        toast({ title: 'User deleted', description: `${deleteTarget.username} removed.`, type: 'info' });
        setDeleteTarget(null);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-5xl">
            {/* ── Users table ── */}
            <Card>
                <CardHeader className="border-b border-slate-100 flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-indigo-50 rounded-lg">
                            <Users className="h-3.5 w-3.5 text-indigo-600" />
                        </div>
                        Staff Accounts ({users.length})
                    </CardTitle>
                    <Button size="sm" onClick={() => { setShowCreate(true); setRows([blankRow()]); setBatchErr(''); }}>
                        <UserPlus className="h-4 w-4" /> Add Users
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {users.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="p-3 bg-slate-100 rounded-2xl inline-block mb-3">
                                <Users className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">No staff accounts yet</p>
                            <p className="text-xs text-slate-400 mt-1">Click "Add Users" to create accounts.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/60">
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Username</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Password</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Expires</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Deactivates</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {users.map(user => {
                                        const status = getUserStatus(user);
                                        return (
                                            <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-xs font-bold text-indigo-600">
                                                                {user.username.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-slate-800 font-medium truncate max-w-[140px]">{user.username}</p>
                                                            {user.name && <p className="text-xs text-slate-400 truncate max-w-[140px]">{user.name}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                                                    {user.email || <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                                                    <PasswordCell password={user.password} />
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                                                    {user.expiryDate ? (
                                                        <span className={cn('flex items-center gap-1', new Date(user.expiryDate) <= new Date() ? 'text-rose-600' : '')}>
                                                            <CalendarDays className="h-3 w-3" /> {fmtDate(user.expiryDate)}
                                                        </span>
                                                    ) : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                                                    {user.deactivationDate ? (
                                                        <span className={cn('flex items-center gap-1', new Date(user.deactivationDate) <= new Date() ? 'text-rose-600' : '')}>
                                                            <Clock className="h-3 w-3" /> {fmtDate(user.deactivationDate)}
                                                        </span>
                                                    ) : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3"><StatusBadge status={status} /></td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => openEdit(user)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit">
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button onClick={() => { setResetUser(user); setNewPass(''); setResetErr(''); setShowNewPass(false); }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Reset password">
                                                            <KeyRound className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button onClick={() => setDeleteTarget(user)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Delete">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Admin readonly card ── */}
            <Card className="border-indigo-200 bg-indigo-50/30">
                <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-indigo-900">Administrator</p>
                            <p className="text-xs text-indigo-600 mt-0.5">Built-in admin account — always active, cannot be deleted</p>
                        </div>
                        <StatusBadge status="active" />
                    </div>
                </CardContent>
            </Card>

            {/* ══════════════════════════ BATCH CREATE MODAL ══════════════════════════ */}
            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Users" size="2xl">
                <ModalBody className="space-y-3 max-h-[70vh] overflow-y-auto">

                    {/* User rows */}
                    {rows.map((row, idx) => (
                        <div key={row._id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2.5">

                            {rows.length > 1 && (
                                <p className="text-xs font-semibold text-slate-400">User {idx + 1}</p>
                            )}

                            {/* Row 1: Username / Email / Password / Remove */}
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Username *</span>
                                    <Input
                                        value={row.username}
                                        onChange={e => updateRow(row._id, { username: e.target.value })}
                                        placeholder="username"
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Email</span>
                                    <Input
                                        type="email"
                                        value={row.email}
                                        onChange={e => updateRow(row._id, { email: e.target.value })}
                                        placeholder="optional"
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Password *</span>
                                    <div className="relative">
                                        <Input
                                            type={row.showPass ? 'text' : 'password'}
                                            value={row.password}
                                            onChange={e => updateRow(row._id, { password: e.target.value })}
                                            placeholder="min 6 chars"
                                            className="pr-9"
                                            autoComplete="new-password"
                                        />
                                        <button type="button"
                                            onClick={() => updateRow(row._id, { showPass: !row.showPass })}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                                            {row.showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <button type="button"
                                    onClick={() => removeRow(row._id)}
                                    disabled={rows.length === 1}
                                    className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Remove row">
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Row 2: Validity */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Validity</span>
                                <ValidityToggle row={row} onChange={p => updateRow(row._id, p)} />
                                {row.validityType === 'days' ? (
                                    <Input
                                        type="number"
                                        min={1}
                                        value={row.validityDays}
                                        onChange={e => updateRow(row._id, { validityDays: e.target.value })}
                                        placeholder="e.g. 30"
                                        className="w-28"
                                    />
                                ) : (
                                    <Input
                                        type="date"
                                        value={row.validityDate}
                                        onChange={e => updateRow(row._id, { validityDate: e.target.value })}
                                        className="w-40"
                                    />
                                )}
                                <p className="text-[11px] text-slate-400 ml-1">
                                    {row.validityType === 'days' && (row.validityDays > 0
                                        ? `Expires ${fmtDate(new Date(Date.now() + Number(row.validityDays) * 86_400_000).toISOString())}`
                                        : 'Leave blank = no expiry')}
                                    {row.validityType === 'date' && (row.validityDate 
                                        ? `Expires ${fmtDate(row.validityDate)}` 
                                        : 'Leave blank = no expiry')}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Add another row */}
                    <button type="button"
                        onClick={() => setRows(prev => [...prev, blankRow()])}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-colors text-sm font-medium">
                        <Plus className="h-4 w-4" /> Add another user
                    </button>

                    {batchErr && (
                        <p className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{batchErr}</p>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button onClick={handleBatchCreate}>
                        <UserPlus className="h-4 w-4" />
                        Create {rows.length > 1 ? `${rows.length} Users` : 'User'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* ══════════════════════════ EDIT USER MODAL ══════════════════════════ */}
            <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="sm">
                <ModalBody className="space-y-4">
                    <div>
                        <label htmlFor="editUsername" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            Username <span className="text-rose-500">*</span>
                        </label>
                        <Input id="editUsername" value={editForm.username || ''} autoFocus
                            onChange={e => setEditForm({ ...editForm, username: e.target.value })} />
                    </div>
                    <div>
                        <label htmlFor="editEmail" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            Email
                        </label>
                        <Input id="editEmail" type="email" value={editForm.email || ''}
                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                            placeholder="Optional contact email" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> Expiry Date
                            </label>
                            <Input type="date" value={editForm.expiryDate || ''}
                                onChange={e => setEditForm({ ...editForm, expiryDate: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                <UserX className="h-3 w-3" /> Deactivation
                            </label>
                            <Input type="date" value={editForm.deactivationDate || ''}
                                onChange={e => setEditForm({ ...editForm, deactivationDate: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                        <div>
                            <p className="text-sm font-medium text-slate-800">Account Active</p>
                            <p className="text-xs text-slate-500 mt-0.5">Allow this user to log in</p>
                        </div>
                        <button type="button"
                            onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                            className={cn('relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent cursor-pointer transition-colors duration-200',
                                editForm.isActive ? 'bg-indigo-600' : 'bg-slate-300')}>
                            <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
                                editForm.isActive ? 'translate-x-5' : 'translate-x-0')} />
                        </button>
                    </div>
                    {editErr && <p className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{editErr}</p>}
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
                    <Button onClick={handleEdit}><Pencil className="h-4 w-4" /> Save Changes</Button>
                </ModalFooter>
            </Modal>

            {/* ══════════════════════════ RESET PASSWORD MODAL ══════════════════════ */}
            <Modal isOpen={!!resetUser} onClose={() => setResetUser(null)} title="Reset Password" size="sm">
                <ModalBody className="space-y-4">
                    {resetUser && (
                        <p className="text-sm text-slate-600">
                            Set a new password for <strong className="text-slate-800">{resetUser.username}</strong>.
                        </p>
                    )}
                    <div>
                        <label htmlFor="newPassword" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            New Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <Input id="newPassword" type={showNewPass ? 'text' : 'password'} value={newPass}
                                onChange={e => setNewPass(e.target.value)} placeholder="Min 6 characters"
                                autoFocus className="pr-10" />
                            <button type="button" onClick={() => setShowNewPass(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                                {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    {resetErr && <p className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{resetErr}</p>}
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setResetUser(null)}>Cancel</Button>
                    <Button onClick={handleReset}><KeyRound className="h-4 w-4" /> Reset Password</Button>
                </ModalFooter>
            </Modal>

            {/* ══════════════════════════ DELETE CONFIRM MODAL ══════════════════════ */}
            <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete User?" size="sm">
                <ModalBody>
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">This cannot be undone.</p>
                            <p className="text-sm text-slate-600 mt-1">
                                The account for <strong>{deleteTarget?.username}</strong> will be permanently deleted.
                            </p>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4" /> Delete User
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default UserManagement;
