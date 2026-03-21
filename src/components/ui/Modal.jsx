import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4',
};

const Modal = ({ isOpen, onClose, title, children, size = 'md', className }) => {
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Close dialog"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm w-full h-full cursor-default border-none outline-none"
                onClick={onClose}
            />
            {/* Dialog */}
            <div
                className={cn(
                    "relative bg-white rounded-2xl shadow-modal w-full overflow-hidden",
                    "animate-in fade-in zoom-in-95 duration-200",
                    "max-h-[90vh] flex flex-col",
                    sizeMap[size] || sizeMap.md,
                    className
                )}
            >
                {title && (
                    <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
};

const ModalBody = ({ className, children, ...props }) => (
    <div className={cn("px-6 py-5 flex-1 min-h-0 overflow-y-auto", className)} {...props}>{children}</div>
);

const ModalFooter = ({ className, children, ...props }) => (
    <div className={cn("flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50", className)} {...props}>
        {children}
    </div>
);

const ModalPropTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

Modal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string,
    children: PropTypes.node,
    size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', '2xl', 'full']),
    className: PropTypes.string,
};

ModalBody.propTypes = ModalPropTypes;
ModalFooter.propTypes = ModalPropTypes;

export { Modal, ModalBody, ModalFooter };
