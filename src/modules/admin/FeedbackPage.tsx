// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bug, Lightbulb, Wrench, Clock, CheckCircle, XCircle, Eye, MessageSquare, Image } from 'lucide-react';

interface Feedback {
  id: number;
  user_id: string;
  user_name: string;
  type: string;
  title: string;
  description: string;
  screenshot_url: string;
  status: string;
  admin_comment: string;
  created_at: string;
}

const FeedbackPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [adminComment, setAdminComment] = useState('');

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setFeedbacks(data);
    setLoading(false);
  };

  const updateStatus = async (id: number, status: string, comment?: string) => {
    await supabase.from('feedback').update({
      status,
      admin_comment: comment || null,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status, admin_comment: comment || f.admin_comment } : f));
    setSelectedFeedback(null);
    setAdminComment('');
  };

  const typeIcons = {
    bug: { icon: Bug, color: 'text-red-500', bg: 'bg-red-100', label: 'Ошибка' },
    feature: { icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Новая функция' },
    improvement: { icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Улучшение' }
  };

  const statusBadges = {
    new: { color: 'bg-blue-100 text-blue-700', label: 'Новое' },
    reviewed: { color: 'bg-purple-100 text-purple-700', label: 'Рассмотрено' },
    in_progress: { color: 'bg-yellow-100 text-yellow-700', label: 'В работе' },
    resolved: { color: 'bg-green-100 text-green-700', label: 'Решено' },
    rejected: { color: 'bg-gray-100 text-gray-700', label: 'Отклонено' }
  };

  const filteredFeedbacks = feedbacks.filter(f => 
    statusFilter === 'all' || f.status === statusFilter
  );

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Обратная связь</h1>
          <p className="text-gray-500">Баги и предложения от пользователей</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Новых: {feedbacks.filter(f => f.status === 'new').length}
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border rounded-lg"
          >
            <option value="all">Все статусы</option>
            <option value="new">Новые</option>
            <option value="reviewed">Рассмотренные</option>
            <option value="in_progress">В работе</option>
            <option value="resolved">Решённые</option>
            <option value="rejected">Отклонённые</option>
          </select>
        </div>
      </div>

      {filteredFeedbacks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Нет обращений</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map(feedback => {
            const typeInfo = typeIcons[feedback.type] || typeIcons.bug;
            const TypeIcon = typeInfo.icon;
            const statusInfo = statusBadges[feedback.status] || statusBadges.new;

            return (
              <div key={feedback.id} className="bg-white rounded-lg shadow border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${typeInfo.bg}`}>
                      <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{feedback.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {feedback.screenshot_url && (
                          <Image className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{feedback.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{feedback.user_name || 'Аноним'}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(feedback.created_at).toLocaleString('ru')}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${typeInfo.bg} ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </div>
                      {feedback.admin_comment && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                          <span className="font-medium">Комментарий:</span> {feedback.admin_comment}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFeedback(feedback)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <Eye className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно деталей */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">{selectedFeedback.title}</h2>
              <p className="text-sm text-gray-500">
                От: {selectedFeedback.user_name} • {new Date(selectedFeedback.created_at).toLocaleString('ru')}
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Описание</label>
                <p className="p-3 bg-gray-50 rounded">{selectedFeedback.description || 'Нет описания'}</p>
              </div>

              {selectedFeedback.screenshot_url && (
                <div>
                  <label className="block text-sm font-medium mb-1">Скриншот</label>
                  <img 
                    src={selectedFeedback.screenshot_url} 
                    alt="Screenshot" 
                    className="max-w-full rounded border"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Комментарий администратора</label>
                <textarea
                  value={adminComment || selectedFeedback.admin_comment || ''}
                  onChange={(e) => setAdminComment(e.target.value)}
                  className="w-full p-2 border rounded"
                  rows={2}
                  placeholder="Добавить комментарий..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Изменить статус</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateStatus(selectedFeedback.id, 'reviewed', adminComment)}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                  >
                    Рассмотрено
                  </button>
                  <button
                    onClick={() => updateStatus(selectedFeedback.id, 'in_progress', adminComment)}
                    className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                  >
                    В работе
                  </button>
                  <button
                    onClick={() => updateStatus(selectedFeedback.id, 'resolved', adminComment)}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Решено
                  </button>
                  <button
                    onClick={() => updateStatus(selectedFeedback.id, 'rejected', adminComment)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Отклонено
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => { setSelectedFeedback(null); setAdminComment(''); }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackPage;
