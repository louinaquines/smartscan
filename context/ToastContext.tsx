import React, { createContext, useContext, useState, ReactNode } from 'react';
import Toast from '../components/Toast';

interface ToastContextType {
  showToast: (message: string, price?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toastState, setToastState] = useState<{
    visible: boolean;
    message: string;
    price?: string;
  }>({
    visible: false,
    message: '',
    price: undefined,
  });

  const showToast = (message: string, price?: string) => {
    setToastState({ visible: true, message, price });
  };

  const handleComplete = () => {
    setToastState((prev) => ({ ...prev, visible: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        visible={toastState.visible}
        message={toastState.message}
        price={toastState.price}
        onComplete={handleComplete}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}