import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toast: React.FC<{ message: ToastMessage; onDismiss: (id: number) => void }> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(message.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle className="text-green-400" />,
    error: <AlertCircle className="text-red-400" />,
    info: <Info className="text-blue-400" />,
  };
  
  const borderColors: Record<ToastType, string> = {
    success: 'border-green-500/50',
    error: 'border-red-500/50',
    info: 'border-blue-500/50',
  };

  return (
    <div
      className={`flex items-start gap-4 p-4 mb-4 rounded-lg shadow-2xl bg-gray-800 border-l-4 ${borderColors[message.type]} animate-slide-in-up`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{icons[message.type]}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-200">{message.message}</p>
      </div>
      <button onClick={() => onDismiss(message.id)} className="text-gray-500 hover:text-white">&times;</button>
    </div>
  );
};


export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    setToasts((prevToasts) => [...prevToasts, { id: Date.now(), message, type }]);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const contextValue = useMemo(() => ({
    addToast,
    success: (message: string) => addToast(message, 'success'),
    error: (message: string) => addToast(message, 'error'),
    info: (message: string) => addToast(message, 'info'),
  }), [addToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-4 right-4 z-[200] w-full max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
