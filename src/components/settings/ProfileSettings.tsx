'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/providers';
import { tokenManager } from '@/lib/api/client';
import SettingsSection from './SettingsSection';
import { LogoIcon } from '@/components/icons/Icons';
import type { User } from '@/types';

interface ProfileSettingsProps {
  user: User;
  onUpdateUser: (data: Partial<User>) => void;
}

export default function ProfileSettings({ user, onUpdateUser }: ProfileSettingsProps) {
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 先做本地预览
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setAvatar(dataUrl);

      // 上传到服务器
      try {
        const token = typeof window !== 'undefined' ? tokenManager.getAccessToken() : null;
        if (!token) {
          alert('请先登录');
          setAvatar(user?.avatarUrl || null);
          return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        const res = await fetch('/api/v1/users/avatar', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        const result = await res.json();

        if (result.code === 200 && result.data?.avatarUrl) {
          setAvatar(result.data.avatarUrl);
          onUpdateUser({ avatarUrl: result.data.avatarUrl });
        } else {
          alert(result.message || '头像上传失败');
          setAvatar(user?.avatarUrl || null);
        }
      } catch (err) {
        console.error('头像上传失败:', err);
        alert('头像上传失败，请重试');
        setAvatar(user?.avatarUrl || null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const token = typeof window !== 'undefined'
        ? tokenManager.getAccessToken()
        : null;

      if (!token) {
        alert('请先登录');
        setIsSaving(false);
        return;
      }

      const currentUsername = user?.username;
      if (!currentUsername) {
        alert('用户信息加载中，请稍后重试');
        setIsSaving(false);
        return;
      }

      const res = await fetch(`/api/v1/users/${currentUsername}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: username !== user?.username ? username : undefined,
          bio: bio || undefined,
          location: location || undefined,
          website: website || undefined,
        }),
      });

      const result = await res.json();

      if (result.code === 200) {
        onUpdateUser({
          username: result.data?.username || username,
          bio: result.data?.bio || bio,
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSection title="个人资料">
      {/* Avatar */}
      <div className="form-group">
        <label className="form-label">头像</label>
        <div className="avatar-edit-row">
          {(avatar || user?.avatarUrl) ? (
            <img
              src={avatar || user?.avatarUrl || ''}
              alt="头像"
              className="avatar-preview"
            />
          ) : (
            <div className="avatar-fallback">
              <LogoIcon />
            </div>
          )}
          <div className="avatar-actions">
            <label className="btn btn-secondary">
              上传头像
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="sr-only"
              />
            </label>
            {avatar && (
              <button className="btn btn-ghost" onClick={async () => {
                try {
                  const token = typeof window !== 'undefined' ? tokenManager.getAccessToken() : null;
                  if (token) {
                    await fetch('/api/v1/me/profile', {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify({ avatarUrl: null }),
                    });
                  }
                } catch (err) {
                  console.error('移除头像失败:', err);
                }
                setAvatar(null);
                onUpdateUser({ avatarUrl: null });
              }}>
                移除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">用户名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
            placeholder="你的用户名"
          />
        </div>

        <div className="form-group form-group-full">
          <label className="form-label">个人简介</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="form-input"
            rows={4}
            placeholder="简单介绍一下你自己"
          />
          <p className="form-hint">支持 Markdown 格式</p>
        </div>

        <div className="form-group">
          <label className="form-label">地区</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="form-input"
            placeholder="你所在的城市"
          />
        </div>

        <div className="form-group">
          <label className="form-label">个人网站</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="form-input"
            placeholder="https://"
          />
        </div>
      </div>

      <div className="form-actions">
        <button 
          className="btn btn-primary" 
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? '保存中...' : '保存更改'}
        </button>
        {saveSuccess && <span className="save-success">保存成功！</span>}
      </div>
    </SettingsSection>
  );
}