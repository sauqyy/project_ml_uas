import React, { useState } from 'react';
import { X, Send, CheckCircle, RefreshCw, LogOut, Copy, Check } from 'lucide-react';

export default function TelegramModal({ isOpen, onClose, status, onDisconnect, onRefresh }) {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopy = () => {
    if (status?.code) {
      navigator.clipboard.writeText(`/connect ${status.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Send size={22} className="text-blue-500" />
            Connect to Telegram
          </h2>
          <button onClick={onClose} className="icon-btn">
            <X size={24} />
          </button>
        </div>

        {status?.connected ? (
          // Connected State UI
          <div className="text-center py-6">
            <div className="mx-auto bg-green-50 text-green-500 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={36} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Telegram Connected! 🎉</h3>
            <p className="text-sm text-slate-500 mb-6">
              Your account has been successfully connected to Telegram. Now you can directly record expenses through chat conversations or photos of your shopping receipts.
            </p>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-8 text-left text-sm text-slate-600">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Status</span>
                <span className="text-green-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Active
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Telegram Chat ID</span>
                <span className="font-mono text-slate-500">{status.chat_id || '-'}</span>
              </div>
            </div>

            <button 
              onClick={onDisconnect} 
              className="btn-danger flex items-center justify-center gap-2 w-full"
            >
              <LogOut size={16} />
              Disconnect
            </button>
          </div>
        ) : (
          // Unconnected State UI
          <div>
            <p className="text-sm text-slate-500 mb-6">
              Connect your web account to the Telegram bot to easily record transactions through chat messages or upload photos of your shopping receipts anytime!
            </p>

            <div className="mb-6">
              <label className="form-label text-center mb-2 block font-semibold text-slate-700">Your Special Authentication Code</label>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 justify-between">
                <span className="text-3xl font-mono font-bold tracking-widest text-slate-800 flex-1 text-center pl-6">
                  {status?.code || '------'}
                </span>
                <button 
                  onClick={handleCopy}
                  className="icon-btn p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                  title="Copy command"
                >
                  {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-4 mb-8">
              <h4 className="text-sm font-bold text-slate-700">Steps to Connect:</h4>
              
              <div className="flex gap-3 text-sm text-slate-600">
                <div className="bg-blue-50 text-blue-600 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">1</div>
                <div className="flex-1">
                  Open Telegram and search for our official bot: <a href="https://t.me/MoneyMindJournal_bot" target="_blank" rel="noreferrer" className="text-blue-500 font-semibold underline">@MoneyMindJournal_bot</a>
                </div>
              </div>
              
              <div className="flex gap-3 text-sm text-slate-600">
                <div className="bg-blue-50 text-blue-600 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">2</div>
                <div className="flex-1">
                  Start conversation by pressing **Start** or sending the `/start` command.
                </div>
              </div>

              <div className="flex gap-3 text-sm text-slate-600">
                <div className="bg-blue-50 text-blue-600 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">3</div>
                <div className="flex-1">
                  Send your connect code by typing:<br />
                  <code className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono text-xs select-all block mt-1 border border-slate-200">
                    /connect {status?.code}
                  </code>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={handleRefresh} 
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
                disabled={isRefreshing}
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh Status
              </button>
              <button 
                type="button" 
                onClick={onClose} 
                className="btn-primary flex-1"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
