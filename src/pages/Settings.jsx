import { useState, useEffect, useCallback } from 'react';
import { useShop } from '../context/ShopContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal, ModalBody, ModalFooter } from '../components/ui/Modal';
import {
    Save, Upload, Building, Phone, Mail, FileText,
    ImageIcon, ZoomIn, Crop as CropIcon, AlertTriangle, Trash2, Receipt, User
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';
import PropTypes from 'prop-types';
import Cropper from 'react-easy-crop';

const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => { image.onload = resolve; });
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    return canvas.toDataURL('image/png');
};

const FormField = ({ label, required, children, className = '' }) => (
    <div className={`space-y-1 ${className}`}>
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            {label} {required && <span className="text-rose-500 normal-case">*</span>}
        </label>
        {children}
    </div>
);

FormField.propTypes = {
    label: PropTypes.string.isRequired,
    required: PropTypes.bool,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

const IconInput = ({ icon: Icon, ...props }) => (
    <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />}
        <Input {...props} className={Icon ? 'pl-9' : ''} />
    </div>
);

IconInput.propTypes = {
    icon: PropTypes.elementType,
};

const TABS = [
    { id: 'store',   label: 'Store',   icon: Building },
    { id: 'receipt', label: 'Receipt', icon: Receipt  },
    { id: 'owner',   label: 'Owner',   icon: User     },
    { id: 'danger',  label: 'Danger',  icon: AlertTriangle },
];

const Settings = () => {
    const { settings, updateSettings, resetAllData } = useShop();
    const { toast } = useToast();

    const [formData, setFormData]   = useState(settings);
    const [activeTab, setActiveTab] = useState('store');
    const [isSaving, setIsSaving]   = useState(false);

    const [imageSrc,          setImageSrc]          = useState(null);
    const [crop,              setCrop]               = useState({ x: 0, y: 0 });
    const [zoom,              setZoom]               = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels]  = useState(null);
    const [showCropper,       setShowCropper]        = useState(false);
    const [showResetConfirm,  setShowResetConfirm]   = useState(false);

    useEffect(() => { setFormData(settings); }, [settings]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleFileChange = (e) => {
        if (e.target.files?.length > 0) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                toast({ title: 'File too large', description: 'Logo must be under 5 MB.', type: 'error' });
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.addEventListener('load', () => { setImageSrc(reader.result); setShowCropper(true); });
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = useCallback((_, pixels) => { setCroppedAreaPixels(pixels); }, []);

    const handleCropSave = async () => {
        try {
            const cropped = await getCroppedImg(imageSrc, croppedAreaPixels);
            setFormData(prev => ({ ...prev, logo: cropped }));
            setShowCropper(false);
            setImageSrc(null);
            toast({ title: 'Logo updated', description: 'Click Save to apply.', type: 'info' });
        } catch {
            toast({ title: 'Crop failed', type: 'error' });
        }
    };

    const handleSubmit = (e) => {
        e?.preventDefault?.();
        setIsSaving(true);
        updateSettings(formData);
        setTimeout(() => {
            setIsSaving(false);
            toast({ title: 'Settings saved', description: 'Store details updated.', type: 'success' });
        }, 600);
    };

    const handleReset = () => {
        resetAllData();
        setShowResetConfirm(false);
        toast({ title: 'All data wiped', description: 'Inventory, orders and stock logs cleared.', type: 'info' });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-[calc(100vh-8rem)]">

            {/* ── Tab bar ── */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setActiveTab(id)}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
                            activeTab === id && id === 'danger' && 'bg-white text-rose-600 shadow-sm',
                            activeTab === id && id !== 'danger' && 'bg-white text-slate-900 shadow-sm',
                            activeTab !== id && id === 'danger' && 'text-rose-400 hover:text-rose-600',
                            activeTab !== id && id !== 'danger' && 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-5 min-h-0 overflow-y-auto custom-scrollbar">

                {/* Store tab */}
                {activeTab === 'store' && (
                    <div className="flex gap-5 items-stretch">
                        {/* Logo — stretches to match all 4 field rows */}
                        <div className="flex-shrink-0 w-64 flex flex-col gap-2.5">
                            {formData.logo ? (
                                <img src={formData.logo} alt="Logo"
                                    className="flex-1 w-full object-cover rounded-xl shadow border-2 border-white ring-1 ring-slate-200 min-h-0" />
                            ) : (
                                <div className="flex-1 w-full rounded-xl bg-slate-100 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 text-slate-300 min-h-0">
                                    <ImageIcon className="h-8 w-8" />
                                    <span className="text-[9px] mt-1.5 font-medium">No logo</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="logo-upload" />
                            <label htmlFor="logo-upload" className="cursor-pointer flex-shrink-0">
                                <Button type="button" variant="outline" className="pointer-events-none h-7 text-xs px-2.5 w-full" size="sm">
                                    <Upload className="h-3 w-3" /> Upload
                                </Button>
                            </label>
                        </div>

                        {/* Fields */}
                        <div className="flex-1 grid grid-cols-2 gap-3 min-w-0 content-start">
                            <FormField label="Store Name" required className="col-span-2">
                                <Input name="storeName" value={formData.storeName || ''} onChange={handleChange}
                                    placeholder="e.g. Aman Communication" required />
                            </FormField>
                            <FormField label="GSTIN">
                                <IconInput icon={FileText} name="gstin" value={formData.gstin || ''} onChange={handleChange} placeholder="22AAAAA0000A1Z5" />
                            </FormField>
                            <FormField label="PAN">
                                <IconInput icon={FileText} name="pan" value={formData.pan || ''} onChange={handleChange} placeholder="AAAAA0000A" />
                            </FormField>
                            <FormField label="Phone">
                                <IconInput icon={Phone} name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="+91..." />
                            </FormField>
                            <FormField label="Email">
                                <IconInput icon={Mail} name="email" value={formData.email || ''} onChange={handleChange} placeholder="shop@example.com" />
                            </FormField>
                            <FormField label="Address" className="col-span-2">
                                <Input name="address" value={formData.address || ''} onChange={handleChange} placeholder="Shop No, Market, City..." />
                            </FormField>
                        </div>
                    </div>
                )}

                {/* Receipt tab */}
                {activeTab === 'receipt' && (
                    <div className="max-w-lg space-y-4">
                        <p className="text-xs text-slate-500">This text appears at the bottom of every printed bill.</p>
                        <FormField label="Bill Footer Message">
                            <Input name="footerMessage" value={formData.footerMessage || ''} onChange={handleChange}
                                placeholder="e.g. Thank you for shopping with us!" />
                        </FormField>
                    </div>
                )}

                {/* Owner tab */}
                {activeTab === 'owner' && (
                    <div className="max-w-xl">
                        <p className="text-xs text-slate-500 mb-4">Owner contact details (for internal reference).</p>
                        <div className="grid grid-cols-3 gap-3">
                            <FormField label="Name">
                                <Input name="ownerName" value={formData.ownerName || ''} onChange={handleChange} placeholder="Full name" />
                            </FormField>
                            <FormField label="Mobile">
                                <Input name="ownerPhone" value={formData.ownerPhone || ''} onChange={handleChange} placeholder="Personal number" />
                            </FormField>
                            <FormField label="Email">
                                <Input name="ownerEmail" value={formData.ownerEmail || ''} onChange={handleChange} placeholder="Personal email" />
                            </FormField>
                        </div>
                    </div>
                )}

                {/* Danger tab */}
                {activeTab === 'danger' && (
                    <div className="max-w-lg">
                        <div className="flex items-start gap-4 p-4 bg-rose-50/60 border border-rose-200 rounded-xl">
                            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <AlertTriangle className="h-5 w-5 text-rose-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-800">Wipe All Data</p>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Permanently deletes all products, stock entries, orders and purchase logs.
                                    Settings and logo are preserved.
                                </p>
                                <Button type="button" variant="danger-outline" size="sm" className="mt-3"
                                    onClick={() => setShowResetConfirm(true)}>
                                    <Trash2 className="h-4 w-4" /> Reset All Data
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Save button (hidden on danger tab) ── */}
            {activeTab !== 'danger' && (
                <div className="flex items-center gap-3 flex-shrink-0">
                    <Button type="submit" size="sm" disabled={isSaving} variant={isSaving ? 'outline' : 'primary'}>
                        {isSaving
                            ? <><div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Saving...</>
                            : <><Save className="h-3.5 w-3.5" /> Save Changes</>}
                    </Button>
                    <span className="text-xs text-slate-400">Changes apply immediately across the app.</span>
                </div>
            )}

            {/* ── Reset Confirm Modal ── */}
            <Modal isOpen={showResetConfirm} onClose={() => setShowResetConfirm(false)} title="Wipe All Data?" size="sm">
                <ModalBody>
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-rose-600" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-900">This cannot be undone.</p>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                All <strong>products</strong>, <strong>stock entries</strong>, <strong>orders</strong>, and <strong>purchase logs</strong> will be permanently deleted.
                            </p>
                            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                Store name, GSTIN, logo and other settings will be preserved.
                            </p>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleReset}>
                        <Trash2 className="h-4 w-4" /> Yes, Wipe Everything
                    </Button>
                </ModalFooter>
            </Modal>

            {/* ── Cropper Modal ── */}
            <Modal isOpen={showCropper} onClose={() => setShowCropper(false)} title="Adjust Logo" size="md">
                <ModalBody className="p-0">
                    <div className="relative h-72 bg-slate-900 w-full">
                        <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1}
                            onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <ZoomIn className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <input type="range" value={zoom} min={1} max={3} step={0.05}
                                onChange={e => setZoom(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                        </div>
                        <Button onClick={handleCropSave} className="w-full" size="md">
                            <CropIcon className="h-4 w-4" /> Crop & Apply
                        </Button>
                    </div>
                </ModalBody>
            </Modal>
        </form>
    );
};

export default Settings;
