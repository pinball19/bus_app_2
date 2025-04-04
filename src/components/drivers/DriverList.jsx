import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDrivers, deactivateDriver } from '../../services/firestoreService';

const DriverList = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // ドライバー一覧を取得
  useEffect(() => {
    const fetchDrivers = async () => {
      setLoading(true);
      try {
        const driversList = await getDrivers(false); // すべてのドライバー（論理削除含む）
        setDrivers(driversList);
        setLoading(false);
      } catch (err) {
        console.error('ドライバー一覧取得エラー:', err);
        setError('ドライバー情報の取得中にエラーが発生しました。');
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  // ドライバーの論理削除
  const handleDeactivateDriver = async (id, name) => {
    if (window.confirm(`ドライバー「${name}」を削除しますか？`)) {
      try {
        await deactivateDriver(id);
        // 成功したら一覧を更新
        setDrivers(prevDrivers => 
          prevDrivers.map(driver => 
            driver.id === id ? { ...driver, isActive: false } : driver
          )
        );
      } catch (err) {
        console.error('ドライバー削除エラー:', err);
        alert('ドライバーの削除中にエラーが発生しました。');
      }
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>ドライバー管理</h1>
        <div>
          <Link to="/" style={{ 
            textDecoration: 'none',
            padding: '8px 16px', 
            backgroundColor: '#1890ff', 
            color: 'white', 
            borderRadius: '4px',
            marginRight: '10px'
          }}>
            ホームに戻る
          </Link>
          <button 
            onClick={() => navigate('/drivers/add')}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#52c41a', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            + ドライバー追加
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>読み込み中...</div>
      ) : error ? (
        <div style={{ color: 'red', padding: '20px' }}>{error}</div>
      ) : (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>ドライバー名</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>備考</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>ステータス</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                    ドライバーが登録されていません
                  </td>
                </tr>
              ) : (
                drivers.map(driver => (
                  <tr 
                    key={driver.id} 
                    style={{ 
                      borderBottom: '1px solid #f0f0f0',
                      opacity: driver.isActive ? 1 : 0.5
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <Link 
                        to={`/drivers/${encodeURIComponent(driver.name)}`}
                        style={{ textDecoration: 'none', color: '#1890ff', fontWeight: 'bold' }}
                      >
                        {driver.name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px' }}>{driver.memo || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: driver.isActive ? '#d9f7be' : '#ffccc7',
                        color: driver.isActive ? '#389e0d' : '#cf1322'
                      }}>
                        {driver.isActive ? '有効' : '無効'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {driver.isActive && (
                        <button
                          onClick={() => handleDeactivateDriver(driver.id, driver.name)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'transparent',
                            color: '#ff4d4f',
                            border: '1px solid #ff4d4f',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          削除
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DriverList;