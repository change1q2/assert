import { useState, useEffect } from 'react';
import { User, Camera, Edit2, Save, Mail, Phone, Globe, Shield, AlertCircle, CheckCircle, LayoutDashboard, Send, Image, Video, Paperclip } from 'lucide-react';

export default function UserProfile({ onAdmin, isAdmin }) {
  const [user, setUser] = useState({
    name: '管理员',
    phone: '',
    email: '',
    avatar: '',
    account: 'admin',
  });
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [language, setLanguage] = useState('zh');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [feedback, setFeedback] = useState({ title: '', content: '' });
  const [feedbackAttachments, setFeedbackAttachments] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  useEffect(() => {
    const savedState = localStorage.getItem('state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.user) {
          setUser(state.user);
        }
      } catch (e) {
        console.error('Failed to parse state');
      }
    }
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
      setLanguage(savedLang);
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  useEffect(() => {
    if (editing) {
      setEditData({ ...user });
    }
  }, [editing, user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('图片大小不能超过2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setAvatarPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveAvatar = () => {
    if (avatarPreview) {
      const updatedUser = { ...user, avatar: avatarPreview };
      setUser(updatedUser);
      setAvatarPreview('');
      saveUserToStorage(updatedUser);
      setSaveSuccess('头像更新成功');
      setTimeout(() => setSaveSuccess(''), 3000);
    }
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const savedState = localStorage.getItem('state');
    let stateData = {};
    if (savedState) {
      try {
        stateData = JSON.parse(savedState);
      } catch (e) {
        console.error('Failed to parse state');
      }
    }
    const updatedState = { ...stateData, user: editData };
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await fetch('/api/state', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ state: updatedState })
        });
        if (!response.ok) {
          throw new Error('保存失败');
        }
      }
    } catch (error) {
      console.error('Failed to sync user info to server:', error);
    }
    
    setUser(editData);
    setEditing(false);
    saveUserToStorage(editData);
    setSaveSuccess('个人信息更新成功');
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const saveUserToStorage = (userData) => {
    const savedState = localStorage.getItem('state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        state.user = userData;
        localStorage.setItem('state', JSON.stringify(state));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.error('Failed to save state');
      }
    }
  };

  const handlePasswordSave = () => {
    setPasswordError('');
    setPasswordSuccess('');
    
    if (passwordData.oldPassword !== 'admin123') {
      setPasswordError('旧密码不正确');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('密码长度不能少于6位');
      return;
    }
    
    setPasswordSuccess('密码修改成功');
    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => {
      setPasswordSuccess('');
      setShowPasswordModal(false);
    }, 2000);
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback.title.trim() || !feedback.content.trim()) {
      alert('请填写问题标题和问题详情');
      return;
    }
    
    setFeedbackLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: '问题反馈',
          title: feedback.title,
          content: feedback.content,
          attachments: feedbackAttachments
        })
      });
      
      if (response.ok) {
        setFeedbackSuccess('反馈提交成功，我们会尽快处理');
        setFeedback({ title: '', content: '' });
        setFeedbackAttachments([]);
        setTimeout(() => setFeedbackSuccess(''), 3000);
      } else {
        const data = await response.json();
        alert(data.message || '提交失败');
      }
    } catch (error) {
      console.error('Feedback submit error:', error);
      alert('提交失败，请稍后重试');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 10 * 1024 * 1024;
    
    for (const file of files) {
      if (file.size > maxSize) {
        alert(`文件 ${file.name} 超过10MB限制`);
        return;
      }
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert(`文件 ${file.name} 格式不支持，仅支持图片和视频`);
        return;
      }
    }
    
    const newAttachments = files.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
      data: ''
    }));
    setFeedbackAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index) => {
    setFeedbackAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const t = {
    zh: {
      title: '个人中心',
      basicInfo: '基本信息',
      edit: '编辑',
      save: '保存',
      cancel: '取消',
      name: '姓名',
      phone: '手机号',
      email: '邮箱',
      account: '登录账号',
      version: '系统版本',
      avatarUpload: '上传头像',
      changePassword: '修改密码',
      language: '语言',
      chinese: '中文',
      english: 'English',
      oldPassword: '旧密码',
      newPassword: '新密码',
      confirmPassword: '确认新密码',
      updateSuccess: '更新成功',
      feedback: '问题反馈',
      feedbackTitle: '问题标题',
      feedbackContent: '问题详情',
      feedbackAttachments: '附件上传',
      feedbackSubmit: '提交反馈',
      feedbackSuccess: '反馈提交成功',
      selectImageVideo: '选择图片或视频',
    },
    en: {
      title: 'Profile',
      basicInfo: 'Basic Info',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      account: 'Account',
      version: 'Version',
      avatarUpload: 'Upload Avatar',
      changePassword: 'Change Password',
      language: 'Language',
      chinese: '中文',
      english: 'English',
      oldPassword: 'Old Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      updateSuccess: 'Updated successfully',
      feedback: 'Feedback',
      feedbackTitle: 'Title',
      feedbackContent: 'Content',
      feedbackAttachments: 'Attachments',
      feedbackSubmit: 'Submit',
      feedbackSuccess: 'Feedback submitted',
      selectImageVideo: 'Select image or video',
    },
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t[language].title}</h1>
        </div>

        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span>{saveSuccess}</span>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col items-center">
            <div className="relative mb-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white ${
                user.avatar ? 'bg-gray-200' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
              }`}>
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  getInitial(user.name)
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center cursor-pointer transition-colors">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              {avatarPreview && (
                <div className="mt-4 flex gap-2">
                  <img src={avatarPreview} alt="preview" className="w-12 h-12 rounded-full object-cover" />
                  <button
                    onClick={saveAvatar}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {t[language].save}
                  </button>
                  <button
                    onClick={() => setAvatarPreview('')}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t[language].cancel}
                  </button>
                </div>
              )}
            </div>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{user.name}</h2>

            <div className="w-full space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t[language].account}</p>
                    <p className="font-medium text-gray-900 dark:text-white">{user.account}</p>
                  </div>
                </div>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[language].name}
                    </label>
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => handleEditChange('name', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[language].phone}
                    </label>
                    <input
                      type="tel"
                      value={editData.phone || ''}
                      onChange={(e) => handleEditChange('phone', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="请输入手机号"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[language].email}
                    </label>
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => handleEditChange('email', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="请输入邮箱"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {t[language].save}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t[language].cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t[language].phone}</p>
                        <p className="font-medium text-gray-900 dark:text-white">{user.phone || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t[language].email}</p>
                        <p className="font-medium text-gray-900 dark:text-white">{user.email || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditing(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    {t[language].edit}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">管理后台</h3>
            <button
              onClick={onAdmin}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              进入管理后台
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[language].changePassword}</h3>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Shield className="w-5 h-5" />
            {t[language].changePassword}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[language].language}</h3>
          <div className="flex gap-3">
            <button
              onClick={() => handleLanguageChange('zh')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                language === 'zh'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Globe className="w-4 h-4" />
              {t[language].chinese}
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                language === 'en'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Globe className="w-4 h-4" />
              {t[language].english}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[language].feedback}</h3>
          
          {feedbackSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>{feedbackSuccess}</span>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t[language].feedbackTitle}
              </label>
              <input
                type="text"
                value={feedback.title}
                onChange={(e) => setFeedback(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="请输入问题标题"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t[language].feedbackContent}
              </label>
              <textarea
                value={feedback.content}
                onChange={(e) => setFeedback(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={4}
                placeholder="请详细描述您遇到的问题，支持图文描述"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t[language].feedbackAttachments}
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                  <Paperclip className="w-4 h-4" />
                  <span>{t[language].selectImageVideo}</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleAttachmentChange}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">支持图片和视频，单文件不超过10MB</span>
              </div>
              
              {feedbackAttachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {feedbackAttachments.map((attachment, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      {attachment.type.startsWith('image/') ? (
                        <Image className="w-4 h-4 text-green-600" />
                      ) : (
                        <Video className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{attachment.name}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-gray-500 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={handleFeedbackSubmit}
              disabled={feedbackLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              {feedbackLoading ? '提交中...' : t[language].feedbackSubmit}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">{t[language].version}</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">V1.0.42</span>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t[language].changePassword}</h3>
            
            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{passwordError}</span>
              </div>
            )}
            
            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>{passwordSuccess}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t[language].oldPassword}
                </label>
                <input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="请输入旧密码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t[language].newPassword}
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="请输入新密码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t[language].confirmPassword}
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="请再次输入新密码"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t[language].cancel}
              </button>
              <button
                onClick={handlePasswordSave}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t[language].save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
