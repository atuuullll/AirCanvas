import { useState } from 'react';
import { motion } from 'motion/react';

export function ShareModal({ isOpen, onClose, shareLink, viewerCount, isSharing }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-slate-900 rounded-12 p-6 max-w-md w-full mx-4 border border-slate-700"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Share Canvas</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {isSharing ? (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Share Link</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-slate-700 text-white px-3 py-2 rounded text-sm border border-slate-600"
                />
                <button
                  onClick={handleCopyLink}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-sm text-slate-300">
                👥 Viewers: <span className="font-bold text-emerald-400">{viewerCount}</span>
              </p>
            </div>

            <p className="text-xs text-slate-400">
              Share this link with others to let them see your canvas in real-time. Only your canvas will be visible.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <p className="text-slate-300 mb-2">Start sharing to create a link</p>
              <p className="text-xs text-slate-400">Others will be able to see your canvas in real-time</p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
