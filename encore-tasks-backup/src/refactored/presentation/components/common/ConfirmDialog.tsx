import React from 'react';
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: AlertTriangle,
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-700/25',
          iconBg: 'bg-red-500/20',
          iconColor: 'text-red-400'
        };
      case 'warning':
        return {
          icon: AlertCircle,
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg hover:shadow-yellow-700/25',
          iconBg: 'bg-yellow-500/20',
          iconColor: 'text-yellow-400'
        };
      case 'primary':
        return {
          icon: Info,
          confirmButton: 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-primary-700/25',
          iconBg: 'bg-primary-500/20',
          iconColor: 'text-primary-400'
        };
      case 'info':
        return {
          icon: Info,
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-700/25',
          iconBg: 'bg-blue-500/20',
          iconColor: 'text-blue-400'
        };
      default:
        return {
          icon: AlertCircle,
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg hover:shadow-yellow-700/25',
          iconBg: 'bg-yellow-500/20',
          iconColor: 'text-yellow-400'
        };
    }
  };

  const styles = getVariantStyles();
  const IconComponent = styles.icon;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="glass-dark p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${styles.iconBg} rounded-lg`}>
              <IconComponent className={`w-5 h-5 ${styles.iconColor}`} />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Message */}
        <p className="text-gray-300 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200 font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${styles.confirmButton}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  // Рендерим модальное окно в body через портал
  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default ConfirmDialog;
export { ConfirmDialog };