import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export const CustomerMessageFAB: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  // If user is not logged in, we don't render the FAB (requires auth to write)
  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'customer_messages'), {
        message: message.trim(),
        senderEmail: user.email,
        senderName: user.displayName || 'Unknown User',
        timestamp: Timestamp.now(),
      });
      setSuccess(true);
      setMessage('');
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanding Form Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-[#2A2E45] border border-[#3D405B] rounded-2xl shadow-2xl p-4 animate-fade-in-up origin-bottom-right">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold tracking-wide">Contact Admin</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition">
              ✕
            </button>
          </div>

          {success ? (
            <div className="bg-[#00D2A0]/10 border border-[#00D2A0]/30 text-[#00D2A0] rounded-xl p-4 text-center text-sm font-medium">
              Message sent successfully!
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Report an issue or send feedback..."
                className="w-full h-32 bg-[#1E2336] border border-[#3D405B] rounded-xl p-3 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-[#5D618C]"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="mt-3 w-full bg-[#5D618C] hover:bg-[#6D71A0] disabled:bg-[#3D405B] disabled:text-slate-500 text-white font-bold py-2 rounded-xl transition-colors text-sm"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#5D618C] hover:bg-[#6D71A0] rounded-full shadow-lg shadow-[#1E2336]/50 flex items-center justify-center transition-transform hover:scale-105"
        title="Contact Admin"
      >
        {isOpen ? (
          <span className="text-white text-xl">✕</span>
        ) : (
          <span className="text-white text-2xl">💬</span>
        )}
      </button>
    </div>
  );
};
