// @ts-nocheck
import React, { useState } from 'react';
import { MessageSquarePlus, X, Bug, Lightbulb, Wrench, Upload, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const FeedbackButton: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    type: 'bug',
    title: '',
    description: '',
    screenshot_url: ''
  });

  const feedbackTypes = [
    { value: 'bug', label: 'Ошибка', icon: Bug, color: 'text-red-500' },
    { value: 'feature', label: 'Новая функция', icon: Lightbulb, color: 'text-yellow-500' },
    { value: 'improvement', label: 'Улучшение', icon: Wrench, color: 'text-blue-500' }
  ];

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    
    setSending(true);
    try {
      await supabase.from('feedback').insert({
        user_id: user?.id,
        user_name: user?.name,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        screenshot_url: formData.screenshot_url || null,
        status: 'new'
      });
      
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setFormData({ type: 'bug', title: '', description: '', screenshot_url: '' });
      }, 2000);
    } catch (err) {
      console.error('Error sending feedback:', err);
      alert('Ошибка отправки. Попробуйте позже.');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Конвертируем в base64 для простоты (в реальном проекте лучше загружать в Storage)
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, screenshot_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  if (!user || user.role === 'admin') return null;

  return (
    <>
      {/* Плавающая кнопка */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 flex items-center justify-center z-40 transition-transform hover:scale-110"
        title="Обратная связь"
      >
        <MessageSquarePlus className="w-6 h-6" />
      </button>

      {/* Модальное окно */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Обратная связь</h2>
              <button onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {success ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-700">Отправлено!</h3>
                <p className="text-gray-500 mt-2">Спасибо за обратную связь</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Тип обращения */}
                <div>
                  <label className="block text-sm font-medium mb-2">Тип обращения</label>
                  <div className="flex gap-2">
                    {feedbackTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          onClick={() => setFormData({ ...formData, type: type.value })}
                          className={`flex-1 p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                            formData.type === type.value
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${type.color}`} />
                          <span className="text-xs">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Заголовок */}
                <div>
                  <label className="block text-sm font-medium mb-1">Краткое описание *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Например: Не работает кнопка сохранения"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                {/* Подробности */}
                <div>
                  <label className="block text-sm font-medium mb-1">Подробности</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Опишите проблему или предложение подробнее..."
                    className="w-full p-2 border rounded-lg"
                    rows={3}
                  />
                </div>

                {/* Скриншот */}
                <div>
                  <label className="block text-sm font-medium mb-1">Скриншот (опционально)</label>
                  {formData.screenshot_url ? (
                    <div className="relative">
                      <img 
                        src={formData.screenshot_url} 
                        alt="Screenshot" 
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => setFormData({ ...formData, screenshot_url: '' })}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-500">Нажмите для загрузки</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Кнопка отправки */}
                <button
                  onClick={handleSubmit}
                  disabled={!formData.title.trim() || sending}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? 'Отправка...' : (
                    <>
                      <Send className="w-4 h-4" />
                      Отправить
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;
