import React from 'react';
import { format } from 'date-fns';

const MessageList = ({ messages, loading }) => {
  // メッセージを日付順（新しいものが下）に並べ替え
  const sortedMessages = [...messages].sort((a, b) => {
    const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
    const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
    return dateA - dateB; // 古い順に並べる
  });

  return (
    <div 
      className="chat-container" 
      style={{
        minHeight: '200px',
        padding: '15px',
        backgroundColor: '#f9f9f9',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      {loading ? (
        <div style={{textAlign: 'center', color: '#888'}}>メッセージを読み込み中...</div>
      ) : sortedMessages.length === 0 ? (
        <div style={{textAlign: 'center', color: '#888'}}>まだメッセージはありません。最初のメッセージを送信しましょう。</div>
      ) : (
        sortedMessages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.type === 'system' ? 'system-message' : 'user-message'}`}
            style={{
              marginBottom: '10px',
              padding: '10px 12px',
              borderRadius: '5px',
              width: 'auto',
              backgroundColor: message.type === 'system' ? '#fffde7' : '#e3f2fd',
              borderLeft: message.type === 'system' ? '3px solid #ffc107' : '3px solid #2196f3',
              whiteSpace: 'pre-wrap',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
              <strong style={{fontSize: '14px'}}>{message.username}</strong>
              <span style={{fontSize: '12px', color: '#777'}}>
                {message.timestamp ? format(message.timestamp, 'yyyy/MM/dd HH:mm') : ''}
              </span>
            </div>
            <div>{message.text}</div>
          </div>
        ))
      )}
    </div>
  );
};

export default MessageList;