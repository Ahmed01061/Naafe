import Button from '../../../components/ui/Button';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  // Handle outside click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={handleOverlayClick}
    >
      <div className={`bg-[#FDF8F0] rounded-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden shadow-2xl border border-[#F5E6D3] animate-in slide-in-from-bottom-4 duration-300`}>
        <div className="flex items-center justify-between p-6 border-b border-[#F5E6D3] bg-gradient-to-r from-[#FDF8F0] to-[#F8F2E8]">
          <h3 className="text-xl font-bold text-deep-teal font-cairo">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-[#F5E6D3] transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5 text-deep-teal" />
          </Button>
        </div>
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
        <div className="p-6 text-[#0e1b18]">
          {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;