import React, { useState, useEffect } from 'react';
import { Mail, Save, Check, AlertTriangle, TestTube } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

interface EmailPreferences {
  emailEnabled: boolean;
  email: string;
  notifyOnFunded: boolean;
  notifyOnRepaid: boolean;
  notifyOnDueSoon: boolean;
  notifyOnDefault: boolean;
}

const EmailNotificationSettings: React.FC = () => {
  const { account } = useWallet();
  const [preferences, setPreferences] = useState<EmailPreferences>({
    emailEnabled: false,
    email: '',
    notifyOnFunded: true,
    notifyOnRepaid: true,
    notifyOnDueSoon: true,
    notifyOnDefault: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load preferences on mount
  useEffect(() => {
    if (account) {
      loadPreferences();
    }
  }, [account]);

  const loadPreferences = async () => {
    if (!account) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/email-notifications/preferences/${account}`);
      const data = await response.json();
      
      if (data.success) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to load email preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!account) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/email-notifications/preferences/${account}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Email preferences saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save preferences' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save email preferences' });
      console.error('Failed to save email preferences:', error);
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const sendTestEmail = async () => {
    if (!preferences.email) {
      setMessage({ type: 'error', text: 'Please enter an email address first' });
      return;
    }

    try {
      setIsTesting(true);
      const response = await fetch('/api/email-notifications/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: preferences.email, userAddress: account }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Test email sent successfully! Check your inbox.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send test email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send test email' });
      console.error('Failed to send test email:', error);
    } finally {
      setIsTesting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleInputChange = (key: keyof EmailPreferences, value: boolean | string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (!account) {
    return (
      <div className="text-center py-8">
        <Mail className="mx-auto text-gray-600 mb-3" size={32} />
        <p className="text-gray-400">Please connect your wallet to configure email notifications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Mail className="text-blue-400" size={24} />
        <h2 className="text-xl font-semibold text-white">Email Notifications</h2>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-900/20 border border-green-800 text-green-400' 
            : 'bg-red-900/20 border border-red-800 text-red-400'
        }`}>
          {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="space-y-4">
          {/* Enable Email Notifications */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="emailEnabled"
              checked={preferences.emailEnabled}
              onChange={(e) => handleInputChange('emailEnabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="emailEnabled" className="text-white font-medium">
              Enable Email Notifications
            </label>
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="flex space-x-2">
              <input
                type="email"
                id="email"
                value={preferences.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                disabled={!preferences.emailEnabled}
              />
              <button
                onClick={sendTestEmail}
                disabled={!preferences.emailEnabled || !preferences.email || isTesting}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isTesting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <TestTube size={16} />
                )}
                <span>Test</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              We'll send you notifications about your loans to this email address.
            </p>
          </div>

          {/* Notification Preferences */}
          {preferences.emailEnabled && (
            <div>
              <h3 className="text-white font-medium mb-3">Notification Preferences</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="notifyOnFunded"
                    checked={preferences.notifyOnFunded}
                    onChange={(e) => handleInputChange('notifyOnFunded', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="notifyOnFunded" className="text-gray-300">
                    Loan Funded - When your loan request is funded by a lender
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="notifyOnRepaid"
                    checked={preferences.notifyOnRepaid}
                    onChange={(e) => handleInputChange('notifyOnRepaid', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="notifyOnRepaid" className="text-gray-300">
                    Loan Repaid - When a loan you funded or borrowed is repaid
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="notifyOnDueSoon"
                    checked={preferences.notifyOnDueSoon}
                    onChange={(e) => handleInputChange('notifyOnDueSoon', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="notifyOnDueSoon" className="text-gray-300">
                    Payment Due Soon - Reminders before loan due dates (24 hours before)
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="notifyOnDefault"
                    checked={preferences.notifyOnDefault}
                    onChange={(e) => handleInputChange('notifyOnDefault', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="notifyOnDefault" className="text-gray-300">
                    Loan Default - When a loan defaults or collateral is claimed
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={savePreferences}
            disabled={isSaving || isLoading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save size={16} />
            )}
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailNotificationSettings;