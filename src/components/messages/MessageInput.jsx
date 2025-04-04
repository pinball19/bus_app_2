import React, { useState } from 'react';

const MessageInput = ({ username, onUsernameChange, onSendMessage }) => {
  const [message, setMessage] = useState('');
  
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    if (!message.trim()) return;
    
    const success = await onSendMessage(message);
    if (success) {
      setMessage('');
    }
  };
  
  // Shift+Enterで改行、Enterで送信
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <div style={{borderTop: '1px solid #ddd', padding: '10px'}}>
      <div style={{display: 'flex', marginBottom: '10px'}}>
        <input
          type="text"
          placeholder="表示名"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          style={{
            flex: '0 0 120px',
            marginRight: '10px',
            padding: '8px 10px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
        <input
          type="text"
          placeholder="メッセージを入力..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            flex: '1',
            padding: '8px 10px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          style={{
            marginLeft: '10px',
            padding: '8px 15px',
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          送信
        </button>
      </div>
    </div>
  );
};

export default MessageInput;