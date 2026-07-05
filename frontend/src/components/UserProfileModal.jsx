import React, { useState, useRef } from 'react';
import { X, User, Lock, Upload, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose, userSession, onSave }) {
  if (!isOpen) return null;

  const [username, setUsername] = useState(userSession?.name || '');
  const [avatar, setAvatar] = useState(userSession?.avatar || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be under 2MB! 📁');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result);
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read image file. ❌');
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation for password reset (server re-verifies old password)
    if (newPassword || currentPassword) {
      if (!currentPassword) {
        setError('Enter your old password. 🔒');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New password and confirm password do not match! ❌');
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters! 🔑');
        return;
      }
    }

    setIsLoading(true);

    const result = await onSave({
      username,
      avatar,
      currentPassword: currentPassword || null,
      newPassword: newPassword || null,
    });

    if (!result || !result.ok) {
      setError((result && result.error) || 'Failed to update profile.');
      setIsLoading(false);
      return;
    }

    setSuccess('Profile updated successfully! ✨');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => {
      onClose();
      setSuccess('');
    }, 1000);
    setIsLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Edit Profile</h2>
          <button onClick={onClose} className="icon-btn">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="auth-error" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="auth-success" style={{ marginBottom: '1.5rem' }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Avatar Upload */}
          <div className="avatar-upload-container">
            <div className="relative" style={{ width: '100px', height: '100px' }}>
              {avatar ? (
                <img src={avatar} alt="Avatar Preview" className="avatar-preview-large" />
              ) : (
                <div className="avatar-preview-large">
                  {getInitials(username || userSession?.name)}
                </div>
              )}
              <button 
                type="button" 
                className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full border-2 border-white shadow-md hover:scale-105 active:scale-95 transition-all"
                onClick={triggerFileInput}
                style={{ backgroundColor: 'var(--primary)', cursor: 'pointer', position: 'absolute', bottom: '0', right: '0' }}
              >
                <Camera size={16} />
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>

          {/* Edit Name */}
          <div className="form-group">
            <label className="form-label">Full Name / Username</label>
            <div className="relative">
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Edit Name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <User size={18} className="text-slate-400" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <hr className="border-slate-200 my-6" />
          
          <h3 className="text-sm font-bold text-slate-700 mb-3">Reset Password (Optional)</h3>

          {/* Current Password */}
          <div className="form-group">
            <label className="form-label">Old Password</label>
            <div className="relative">
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Type your old password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required={!!newPassword}
              />
              <Lock size={18} className="text-slate-400" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* New Password & Confirm */}
          <div className="flex gap-4">
            <div className="form-group flex-1">
              <label className="form-label">New Password</label>
              <div className="relative">
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Lock size={18} className="text-slate-400" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Confirm</label>
              <div className="relative">
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Retype password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={!!newPassword}
                />
                <Lock size={18} className="text-slate-400" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 mt-8">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
