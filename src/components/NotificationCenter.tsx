import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, AlertTriangle, DollarSign, Clock, Settings } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { Notification as NotificationInterface, NotificationType } from '../types/notification';
import { formatEther } from 'ethers';
import { requestNotificationPermission, showBrowserNotification } from '../utils/browserNotifications';

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const { notifications, stats, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserNotificationsEnabled(window.Notification.permission === 'granted');
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setBrowserNotificationsEnabled(permission === 'granted');
    
    if (permission === 'granted') {
      showBrowserNotification('Notifications Enabled!', {
        body: 'You will now receive browser notifications for important loan events.',
        tag: 'notification-enabled'
      });
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.LOAN_FUNDED:
        return <DollarSign className="text-green-400" size={16} />;
      case NotificationType.LOAN_REPAID:
        return <Check className="text-blue-400" size={16} />;
      case NotificationType.LOAN_DEFAULTED:
      case NotificationType.LOAN_OVERDUE:
      case NotificationType.COLLATERAL_CLAIMED:
        return <AlertTriangle className="text-red-400" size={16} />;
      case NotificationType.LOAN_DUE_SOON:
        return <Clock className="text-yellow-400" size={16} />;
      default:
        return <Bell className="text-gray-400" size={16} />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const NotificationItem: React.FC<{ notification: NotificationInterface }> = ({ notification }) => (
    <div
      className={`p-4 border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${
        !notification.read ? 'bg-blue-900/10 border-l-4 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium ${notification.read ? 'text-gray-300' : 'text-white'}`}>
              {notification.title}
            </h4>
            <div className="flex items-center space-x-2">
              {!notification.read && (
                <button
                  onClick={() => markAsRead(notification.id)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  title="Mark as read"
                >
                  <Check size={14} />
                </button>
              )}
              <button
                onClick={() => deleteNotification(notification.id)}
                className="text-gray-400 hover:text-red-400 transition-colors"
                title="Delete notification"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <p className={`text-sm mt-1 ${notification.read ? 'text-gray-400' : 'text-gray-300'}`}>
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {formatTimestamp(notification.timestamp)}
            </span>
            {notification.amount && (
              <span className="text-xs text-green-400">
                {parseFloat(formatEther(notification.amount)).toFixed(4)} ETH
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell size={20} />
        
        {/* Badge */}
        {stats.unread > 0 && (
          <span className={`absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white rounded-full ${
            stats.urgent > 0 ? 'bg-red-500' : 'bg-blue-500'
          }`}>
            {stats.unread > 99 ? '99+' : stats.unread}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Notifications
              </h3>
              <div className="flex items-center space-x-2">
                {!browserNotificationsEnabled && (
                  <button
                    onClick={handleEnableNotifications}
                    className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center space-x-1"
                  >
                    <Settings size={14} />
                    <span>Enable Browser</span>
                  </button>
                )}
                {stats.unread > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1"
                  >
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center space-x-1"
                  >
                    <Trash2 size={14} />
                    <span>Clear all</span>
                  </button>
                )}
              </div>
            </div>
            {stats.total > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {stats.unread} unread of {stats.total} total
                {stats.urgent > 0 && (
                  <span className="text-red-400 ml-1">• {stats.urgent} urgent</span>
                )}
              </p>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            ) : (
              <div className="p-8 text-center">
                <Bell className="mx-auto text-gray-600 mb-3" size={32} />
                <h4 className="text-gray-400 font-medium">No notifications</h4>
                <p className="text-gray-500 text-sm mt-1">
                  You'll see loan updates and important events here
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;