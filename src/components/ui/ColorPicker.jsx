import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const PRESET_COLORS = [
    // Vivid
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#ec4899', '#f43f5e', '#64748b',
    // Pastel
    '#fca5a5', '#fdba74', '#fcd34d', '#fde047',
    '#bef264', '#86efac', '#6ee7b7', '#5eead4',
    '#67e8f9', '#93c5fd', '#a5b4fc', '#c4b5fd',
    '#d8b4fe', '#f9a8d4', '#fda4af', '#94a3b8',
    // Dark
    '#991b1b', '#9a3412', '#92400e', '#713f12',
    '#365314', '#14532d', '#064e3b', '#134e4a',
    '#164e63', '#1e3a5f', '#312e81', '#4c1d95',
    // Neutrals
    '#000000', '#1e293b', '#475569', '#94a3b8',
    '#cbd5e1', '#e2e8f0', '#f1f5f9', '#ffffff',
    '#78716c', '#d4a373',
];

const isValidColor = (color) => {
    if (!color?.trim()) return false;
    const s = new Option().style;
    s.color = color;
    return s.color !== '';
};

export const ColorPicker = ({ value, onChange, placeholder = 'e.g. Red, #FF0000' }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);

    const handleToggle = () => {
        if (!open && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 4, left: rect.left });
        }
        setOpen(v => !v);
    };

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (
                containerRef.current && !containerRef.current.contains(e.target) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const validColor = isValidColor(value) ? value : null;

    return (
        <div ref={containerRef} className="relative">
            <div className="flex items-center h-8 rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-indigo-400 transition-all overflow-hidden">
                {/* Live swatch */}
                <div
                    className="h-full w-8 flex-shrink-0 border-r border-slate-200 flex items-center justify-center transition-colors"
                    style={{ backgroundColor: validColor || 'transparent' }}
                >
                    {!validColor && (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300" />
                    )}
                </div>

                {/* Text input */}
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 h-full px-2 text-xs text-slate-700 bg-transparent outline-none placeholder:text-slate-400"
                />

                {/* Palette toggle */}
                <button
                    type="button"
                    onClick={handleToggle}
                    className={cn(
                        "h-full px-2 border-l border-slate-200 transition-colors flex-shrink-0",
                        open ? "text-indigo-500 bg-indigo-50" : "text-slate-400 hover:text-indigo-500 hover:bg-slate-50"
                    )}
                >
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", open && "rotate-180")} />
                </button>
            </div>

            {open && createPortal(
                <div
                    ref={dropdownRef}
                    style={{ top: pos.top, left: pos.left }}
                    className="fixed z-[9999] bg-white rounded-xl shadow-xl border border-slate-200 p-3 w-72"
                >
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Presets</p>
                    <div className="grid grid-cols-10 gap-1.5">
                        {PRESET_COLORS.map(color => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => { onChange(color); setOpen(false); }}
                                className={cn(
                                    "h-6 w-6 rounded-md transition-transform hover:scale-110 active:scale-95",
                                    color === '#ffffff' && "border border-slate-200",
                                    value === color && "ring-2 ring-offset-1 ring-indigo-500"
                                )}
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                        <input
                            type="color"
                            value={validColor || '#6366f1'}
                            onChange={e => onChange(e.target.value)}
                            className="h-7 w-7 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                            title="Custom color"
                        />
                        <span className="text-[10px] text-slate-400 flex-1">Custom</span>
                        {value && (
                            <button
                                type="button"
                                onClick={() => { onChange(''); setOpen(false); }}
                                className="text-[10px] text-rose-400 hover:text-rose-600 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

ColorPicker.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
};
