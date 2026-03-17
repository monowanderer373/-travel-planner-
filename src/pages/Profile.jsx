import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase, hasSupabase } from '../lib/supabase';
import './Profile.css';

function isCloudUser(u) {
  return u?.id && !String(u.id).startsWith('user-');
}

export default function Profile() {
  const { t } = useLanguage();
  const { user, setUser } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!hasSupabase() || !supabase || !isCloudUser(user)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('name,email,bio,avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setName(data?.name || user.name || '');
      setEmail(data?.email || user.email || '');
      setBio(data?.bio || '');
      setAvatarUrl(data?.avatar_url || user.photoURL || '');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.name, user?.email, user?.photoURL]);

  if (!hasSupabase() || !isCloudUser(user)) {
    return <Navigate to="/welcome" replace />;
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const n = name.trim();
      await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            name: n || null,
            email: user.email || null,
            bio: bio.trim() || null,
            avatar_url: avatarUrl.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      await supabase.auth.updateUser({
        data: {
          full_name: n,
          name: n,
          bio: bio.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        },
      });
      setUser({
        ...user,
        name: n || user.email || 'Traveler',
        photoURL: avatarUrl.trim() || user.photoURL,
      });
      setMsg('ok');
    } catch (err) {
      setMsg(err?.message || 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page profile-page">
      <header className="page-header">
        <h1>{t('profile.title')}</h1>
      </header>
      {loading ? (
        <p className="profile-loading">{t('profile.loading')}</p>
      ) : (
        <form className="profile-form" onSubmit={handleSave}>
          <p className="profile-email-row">
            <strong>{t('profile.email')}</strong> {email || '—'}
          </p>
          <label className="profile-label">
            {t('profile.displayName')}
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="profile-label">
            {t('profile.bio')}
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder={t('profile.bioPh')} />
          </label>
          <label className="profile-label">
            {t('profile.avatarUrl')}
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          {avatarUrl && (
            <div className="profile-avatar-preview">
              <img src={avatarUrl} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          )}
          {msg === 'ok' && <p className="profile-msg ok">{t('profile.saved')}</p>}
          {msg && msg !== 'ok' && <p className="profile-msg err">{msg}</p>}
          <button type="submit" className="primary" disabled={saving}>
            {saving ? t('profile.saving') : t('profile.save')}
          </button>
        </form>
      )}
    </div>
  );
}
