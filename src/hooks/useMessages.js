import { useState, useEffect } from 'react';
import { 
  getMessagesForSchedule, 
  addMessageToSchedule 
} from '../services/firestoreService';

export const useMessages = (scheduleId) => {
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState(null);
  
  // メッセージの取得
  useEffect(() => {
    if (!scheduleId) {
      setLoadingMessages(false);
      return;
    }
    
    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const data = await getMessagesForSchedule(scheduleId);
        setMessages(data);
        setLoadingMessages(false);
      } catch (err) {
        console.error('メッセージ取得エラー:', err);
        setError('メッセージの取得中にエラーが発生しました。');
        setLoadingMessages(false);
      }
    };
    
    fetchMessages();
    
    // ここにリアルタイムリスナーを追加することも可能
  }, [scheduleId]);
  
  // メッセージの追加
  const addMessage = async (messageData) => {
    if (!scheduleId) return false;
    
    try {
      await addMessageToSchedule(scheduleId, messageData);
      
      // メッセージリストを更新
      const updatedMessages = await getMessagesForSchedule(scheduleId);
      setMessages(updatedMessages);
      
      return true;
    } catch (err) {
      console.error('メッセージ送信エラー:', err);
      setError('メッセージの送信に失敗しました。');
      return false;
    }
  };
  
  // 履歴メッセージの追加
  const addHistoryMessage = async (changes) => {
    if (!scheduleId || Object.keys(changes).length === 0) return false;
    
    try {
      // 各変更をシステムメッセージとして追加
      for (const field in changes) {
        // バスタイプの変更は無視
        if (field === 'busType') {
          console.log('バスタイプの変更は履歴に記録しません');
          continue;
        }

        const { oldValue, newValue, fieldLabel } = changes[field];
        const fieldName = fieldLabel || field;
        
        // 変更メッセージを作成
        const text = `${fieldName}が「${oldValue}」から「${newValue}」に変更されました`;
        
        await addMessageToSchedule(scheduleId, {
          text,
          type: 'system',
          username: 'システム',
          changes: { [field]: { oldValue, newValue } }
        });
      }
      
      // メッセージリストを更新
      const updatedMessages = await getMessagesForSchedule(scheduleId);
      setMessages(updatedMessages);
      
      return true;
    } catch (err) {
      console.error('履歴メッセージ送信エラー:', err);
      setError('履歴の記録に失敗しました。');
      return false;
    }
  };
  
  return {
    messages,
    loadingMessages,
    error,
    addMessage,
    addHistoryMessage
  };
};