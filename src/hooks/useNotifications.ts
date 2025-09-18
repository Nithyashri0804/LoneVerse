import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Notification as NotificationInterface, NotificationType, NotificationStats } from '../types/notification';
import { useWallet } from './useWallet';
import { useContract } from './useContract';

interface NotificationContextType {
  notifications: NotificationInterface[];
  stats: NotificationStats;
  addNotification: (notification: Omit<NotificationInterface, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationInterface[]>([]);
  const { account } = useWallet();
  const { contract } = useContract();

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (account) {
      const saved = localStorage.getItem(`notifications_${account}`);
      if (saved) {
        try {
          setNotifications(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to parse saved notifications:', error);
        }
      }
    }
  }, [account]);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (account) {
      localStorage.setItem(`notifications_${account}`, JSON.stringify(notifications));
    }
  }, [notifications, account]);

  // Monitor blockchain events and generate notifications
  useEffect(() => {
    if (!contract || !account) return;

    // Define event handlers
    const handleLoanFunded = (loanId: any, borrower: string, lender: string, amount: any) => {
          if (borrower.toLowerCase() === account.toLowerCase()) {
            addNotification({
              type: NotificationType.LOAN_FUNDED,
              title: 'Loan Funded!',
              message: `Your loan request #${loanId} has been funded by ${lender.slice(0, 6)}...${lender.slice(-4)}`,
              urgent: false,
              loanId: Number(loanId),
              amount: amount.toString(),
              userAddress: lender
            });
          } else if (lender.toLowerCase() === account.toLowerCase()) {
            addNotification({
              type: NotificationType.LOAN_FUNDED,
              title: 'Loan Funded Successfully',
              message: `You have successfully funded loan #${loanId} for ${borrower.slice(0, 6)}...${borrower.slice(-4)}`,
              urgent: false,
              loanId: Number(loanId),
              amount: amount.toString(),
              userAddress: borrower
            });
          }
        }
      };

      const handleLoanRepaid = (loanId: any, borrower: string, lender: string, amount: any) => {
          if (borrower.toLowerCase() === account.toLowerCase()) {
            addNotification({
              type: NotificationType.LOAN_REPAID,
              title: 'Loan Repaid Successfully',
              message: `You have successfully repaid loan #${loanId}. Your collateral has been returned.`,
              urgent: false,
              loanId: Number(loanId),
              amount: amount.toString(),
              userAddress: lender
            });
          } else if (lender.toLowerCase() === account.toLowerCase()) {
            addNotification({
              type: NotificationType.LOAN_REPAID,
              title: 'Loan Repaid!',
              message: `Loan #${loanId} has been repaid by ${borrower.slice(0, 6)}...${borrower.slice(-4)}`,
              urgent: false,
              loanId: Number(loanId),
              amount: amount.toString(),
              userAddress: borrower
            });
          }
        }
      };

      const handleCollateralClaimed = (loanId: any, lender: string, borrower: string, collateralAmount: any) => {
          if (borrower.toLowerCase() === account.toLowerCase()) {
            addNotification({
              type: NotificationType.COLLATERAL_CLAIMED,
              title: 'Collateral Claimed',
              message: `Your collateral for loan #${loanId} has been claimed due to default.`,
              urgent: true,
              loanId: Number(loanId),
              amount: collateralAmount.toString(),
              userAddress: lender
            });
          } else if (lender.toLowerCase() === account.toLowerCase()) {
            addNotification({
              type: NotificationType.COLLATERAL_CLAIMED,
              title: 'Collateral Claimed Successfully',
              message: `You have claimed collateral for defaulted loan #${loanId}`,
              urgent: false,
              loanId: Number(loanId),
              amount: collateralAmount.toString(),
              userAddress: borrower
            });
          }
        }
      };

    // Setup event listeners
    try {
      contract.on('LoanFunded', handleLoanFunded);
      contract.on('LoanRepaid', handleLoanRepaid);
      contract.on('CollateralClaimed', handleCollateralClaimed);
    } catch (error) {
      console.error('Failed to setup notification event listeners:', error);
    }

    // Cleanup event listeners
    return () => {
      contract.off('LoanFunded', handleLoanFunded);
      contract.off('LoanRepaid', handleLoanRepaid);
      contract.off('CollateralClaimed', handleCollateralClaimed);
    };
  }, [contract, account]);

  const addNotification = (notification: Omit<NotificationInterface, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationInterface = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 99)]); // Keep max 100 notifications

    // Show browser notification if permission granted and urgent
    if (notification.urgent && 'Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: newNotification.id
      });
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const stats: NotificationStats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    urgent: notifications.filter(n => n.urgent && !n.read).length
  };

  const contextValue: NotificationContextType = {
    notifications,
    stats,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  };

  return React.createElement(NotificationContext.Provider, { value: contextValue }, children);
};