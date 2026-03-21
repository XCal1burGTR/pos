import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useShop } from '../context/ShopContext';
import { cn } from '../utils/cn';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Wallet, Phone, MapPin, Clock, CheckCircle2, Search } from 'lucide-react';

const PaymentHistory = ({ payments, fmt }) => {
    if (!payments?.length) return null;
    return (
        <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Payment History</p>
            <div className="space-y-1">
                {payments.map((p, i) => (
                    <div key={p.date || i} className="flex justify-between items-center text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                        <span className="text-slate-500">
                            {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {p.note ? ` — ${p.note}` : ''}
                        </span>
                        <span className="font-semibold text-emerald-600">+{fmt(p.amount)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
PaymentHistory.propTypes = { payments: PropTypes.array, fmt: PropTypes.func.isRequired };

const RecordPayment = ({ selected, payAmount, setPayAmount, payNote, setPayNote, isRecording, handleRecordPayment }) => {
    if (selected.status !== 'pending') return null;
    return (
        <div className="border-t border-slate-100 pt-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Record Payment</p>
            <div className="flex gap-3 items-end">
                <div className="w-36 flex-shrink-0">
                    <label htmlFor="payAmountInput" className="text-xs text-slate-500 font-medium block mb-1">Amount (₹)</label>
                    <Input id="payAmountInput" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                        className="font-bold" min={0} max={selected.pendingAmount} />
                </div>
                <div className="flex-1">
                    <label htmlFor="payNoteInput" className="text-xs text-slate-500 font-medium block mb-1">Note (optional)</label>
                    <Input id="payNoteInput" placeholder="e.g. Paid via UPI" value={payNote} onChange={e => setPayNote(e.target.value)} />
                </div>
                <Button onClick={handleRecordPayment}
                    disabled={!payAmount || Number.parseFloat(payAmount) <= 0 || isRecording}
                    className="gap-2 flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4" /> Record
                </Button>
            </div>
        </div>
    );
};
RecordPayment.propTypes = {
    selected: PropTypes.object.isRequired, payAmount: PropTypes.string.isRequired,
    setPayAmount: PropTypes.func.isRequired, payNote: PropTypes.string.isRequired,
    setPayNote: PropTypes.func.isRequired, isRecording: PropTypes.bool.isRequired,
    handleRecordPayment: PropTypes.func.isRequired
};

const CreditStats = ({ totalPending, pendingCount, settledCount, totalCollected, fmt }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <Wallet className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <div>
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Total Due</p>
                <p className="text-base font-bold text-amber-700">{fmt(totalPending)}</p>
            </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Pending</p>
            <p className="text-base font-bold text-slate-700">{pendingCount} <span className="text-xs font-normal text-slate-400">orders</span></p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Settled</p>
            <p className="text-base font-bold text-emerald-700">{settledCount} <span className="text-xs font-normal text-emerald-400">orders</span></p>
        </div>
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <div>
                <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">Collected</p>
                <p className="text-base font-bold text-indigo-700">{fmt(totalCollected)}</p>
            </div>
        </div>
    </div>
);
CreditStats.propTypes = { totalPending: PropTypes.number.isRequired, pendingCount: PropTypes.number.isRequired, settledCount: PropTypes.number.isRequired, totalCollected: PropTypes.number.isRequired, fmt: PropTypes.func.isRequired };

const CreditList = ({ filtered, filter, selected, setSelected, setPayAmount, setPayNote, fmt }) => {
    if (filtered.length === 0) {
        return <p className="text-center py-8 text-sm text-slate-400">{filter === 'pending' ? 'No pending credits' : 'No records found'}</p>;
    }
    return filtered.map(credit => (
        <button key={credit.id}
            onClick={() => { setSelected(credit); setPayAmount(String(credit.pendingAmount || '')); setPayNote(''); }}
            className={cn('w-full text-left px-3 py-2.5 rounded-xl border transition-all', selected?.id === credit.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0', credit.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                        {credit.customerName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{credit.customerName}</p>
                        <p className="text-xs text-slate-400 truncate">{credit.customerPhone || '—'}</p>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className={cn('text-sm font-bold', credit.status === 'pending' ? 'text-amber-600' : 'text-emerald-600')}>{credit.status === 'pending' ? fmt(credit.pendingAmount) : 'Settled'}</p>
                    <p className="text-[10px] text-slate-400">{credit.createdAt ? new Date(credit.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</p>
                </div>
            </div>
        </button>
    ));
};
CreditList.propTypes = { filtered: PropTypes.array.isRequired, filter: PropTypes.string.isRequired, selected: PropTypes.object, setSelected: PropTypes.func.isRequired, setPayAmount: PropTypes.func.isRequired, setPayNote: PropTypes.func.isRequired, fmt: PropTypes.func.isRequired };

const CreditDetail = ({ selected, fmt, payAmount, setPayAmount, payNote, setPayNote, isRecording, handleRecordPayment }) => {
    if (!selected) {
        return <div className="h-full flex items-center justify-center"><EmptyState icon={Wallet} title="Select a record" description="Choose a credit entry from the list to view details." /></div>;
    }
    return (
        <div className="space-y-4 max-w-xl">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0', selected.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                        {selected.customerName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">{selected.customerName}</h2>
                        <div className="flex flex-wrap items-center gap-3 mt-0.5">
                            {selected.customerPhone && <span className="text-xs text-slate-500 flex items-center gap-1"><Phone className="h-3 w-3" />{selected.customerPhone}</span>}
                            {selected.customerAddress && <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{selected.customerAddress}</span>}
                            <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3" />{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                            {selected.orderId && <span className="text-xs text-slate-400">Order #{selected.orderId}</span>}
                        </div>
                    </div>
                </div>
                <Badge variant={selected.status === 'pending' ? 'warning' : 'success'}>{selected.status === 'pending' ? 'Pending' : 'Settled'}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Bill Total</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{fmt(selected.totalAmount)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                    <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">Paid</p>
                    <p className="text-base font-bold text-emerald-700 mt-0.5">{fmt(selected.paidAmount || 0)}</p>
                </div>
                <div className={cn('rounded-xl p-3 border', selected.status === 'pending' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200')}>
                    <p className={cn('text-[10px] font-semibold uppercase tracking-wide', selected.status === 'pending' ? 'text-amber-500' : 'text-slate-400')}>{selected.status === 'pending' ? 'Due' : 'Cleared'}</p>
                    <p className={cn('text-base font-bold mt-0.5', selected.status === 'pending' ? 'text-amber-700' : 'text-emerald-600')}>{selected.status === 'pending' ? fmt(selected.pendingAmount) : '₹0.00'}</p>
                </div>
            </div>
            <PaymentHistory payments={selected.payments} fmt={fmt} />
            <RecordPayment selected={selected} payAmount={payAmount} setPayAmount={setPayAmount} payNote={payNote} setPayNote={setPayNote} isRecording={isRecording} handleRecordPayment={handleRecordPayment} />
        </div>
    );
};
CreditDetail.propTypes = { selected: PropTypes.object, fmt: PropTypes.func.isRequired, payAmount: PropTypes.string.isRequired, setPayAmount: PropTypes.func.isRequired, payNote: PropTypes.string.isRequired, setPayNote: PropTypes.func.isRequired, isRecording: PropTypes.bool.isRequired, handleRecordPayment: PropTypes.func.isRequired };

const Credit = () => {
    const { credits, recordCreditPayment } = useShop();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('pending');
    const [selected, setSelected] = useState(null);
    const [payAmount, setPayAmount] = useState('');
    const [payNote, setPayNote] = useState('');
    const [isRecording, setIsRecording] = useState(false);

    const allCredits = credits || [];
    const filtered = allCredits
        .filter(c => filter === 'all' || c.status === filter)
        .filter(c => c.customerName?.toLowerCase().includes(search.toLowerCase()) || c.customerPhone?.includes(search) || String(c.orderId || '').includes(search))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalPending = allCredits.filter(c => c.status === 'pending').reduce((s, c) => s + (c.pendingAmount || 0), 0);
    const pendingCount = allCredits.filter(c => c.status === 'pending').length;
    const settledCount = allCredits.filter(c => c.status === 'settled').length;
    const totalCollected = allCredits.reduce((s, c) => s + (c.paidAmount || 0), 0);

    useEffect(() => {
        if (selected) {
            const updated = allCredits.find(c => c.id === selected.id);
            if (updated) setSelected(updated);
        }
    }, [credits, selected, allCredits]);

    const handleRecordPayment = () => {
        const amt = Number.parseFloat(payAmount);
        if (!amt || amt <= 0 || isRecording) return;
        setIsRecording(true);
        recordCreditPayment(selected.id, amt, payNote);
        setPayAmount('');
        setPayNote('');
        setTimeout(() => setIsRecording(false), 500);
    };

    const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] gap-3 overflow-hidden">
            <CreditStats totalPending={totalPending} pendingCount={pendingCount} settledCount={settledCount} totalCollected={totalCollected} fmt={fmt} />
            <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0 overflow-hidden">
                <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-2 min-h-0">
                    <div className="relative flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input placeholder="Search name, phone, order…" className="pl-9 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-1 flex-shrink-0">
                        {[['pending', 'Pending'], ['settled', 'Settled'], ['all', 'All']].map(([key, label]) => (
                            <button key={key} onClick={() => setFilter(key)}
                                className={cn('flex-1 py-1 rounded-md text-xs font-semibold transition-all', filter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 min-h-0">
                        <CreditList filtered={filtered} filter={filter} selected={selected} setSelected={setSelected} setPayAmount={setPayAmount} setPayNote={setPayNote} fmt={fmt} />
                    </div>
                </div>
                <div className="w-px bg-slate-200 flex-shrink-0" />
                <div className="flex-1 min-w-0 overflow-y-auto pl-2">
                    <CreditDetail selected={selected} fmt={fmt} payAmount={payAmount} setPayAmount={setPayAmount} payNote={payNote} setPayNote={setPayNote} isRecording={isRecording} handleRecordPayment={handleRecordPayment} />
                </div>
            </div>
        </div>
    );
};

export default Credit;
