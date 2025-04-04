import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDriver } from '../../services/firestoreService';

const DriverAdd = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    memo: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // 入力フィールドの変更を処理
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // フォーム送信処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 入力値の検証
    if (!formData.name.trim()) {
      setError('ドライバー名を入力してください');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // ドライバーを追加
      await addDriver(formData);
      
      // 成功したらドライバー一覧に戻る
      alert(`ドライバー「${formData.name}」を登録しました`);
      navigate('/drivers');
    } catch (err) {
      console.error('ドライバー追加エラー:', err);
      setError('ドライバーの登録中にエラーが発生しました。');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link 
          to="/drivers"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', color: '#1890ff' }}
        >
          ← ドライバー一覧に戻る
        </Link>
      </div>
      
      <h1>ドライバー新規登録</h1>
      
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fff2f0', 
            border: '1px solid #ffccc7',
            borderRadius: '4px',
            marginBottom: '20px',
            color: '#ff4d4f'
          }}>
            {error}
          </div>
        )}
        
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="name"
            style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
          >
            ドライバー名 <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '4px', 
              border: '1px solid #d9d9d9' 
            }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="memo"
            style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
          >
            備考
          </label>
          <textarea
            id="memo"
            name="memo"
            value={formData.memo}
            onChange={handleChange}
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '4px', 
              border: '1px solid #d9d9d9',
              minHeight: '100px', 
              resize: 'vertical'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={() => navigate('/drivers')}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '4px', 
              border: '1px solid #d9d9d9',
              backgroundColor: 'white', 
              cursor: 'pointer',
              color: '#000000' // テキスト色を明示的に指定
            }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#1890ff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1 
            }}
          >
            {submitting ? '登録中...' : '登録する'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DriverAdd;