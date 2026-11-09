import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { usersService, type AppUser } from '../services/users.service';

interface Props {
  user: AppUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserModal({ user, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setError('');
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await usersService.update(user.id, { name: name.trim() });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-ink">Edit User Name</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] text-gray-600 mb-1">Email</label>
            <input 
              value={user.email} 
              disabled 
              className="w-full h-10 px-3 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-[14px]" 
            />
          </div>
          
          <div>
            <label className="block text-[13px] text-gray-600 mb-1">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full h-10 px-3 border border-gray-300 rounded-md text-[14px] focus:outline-none focus:border-brand"
            />
          </div>

          {error && <div className="text-[13px] text-red-600 bg-red-50 p-2 rounded-md">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-hover disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
