/**
 * ViewerModal Component
 * Top-left indicator showing "Viewing Shared Canvas" status for viewers
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export function ViewerModal({ ownerName, onClose }) {
  const [connectionStatus, setConnectionStatus] = useState('Connected');

  useEffect(() => {
    setConnectionStatus(`Connected to ${ownerName}'s canvas`);
  }, [ownerName]);

  return (
    <motion.div
      className="fixed top-4 left-4 z-40"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 flex items-center gap-3">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <div className="flex flex-col">
          <p className="text-sm font-medium text-white">Viewing Shared Canvas</p>
          <p className="text-xs text-slate-400">{connectionStatus}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-slate-400 hover:text-white transition-colors"
          title="Stop viewing"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
