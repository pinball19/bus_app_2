import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDriverByName, getDriverSchedules, checkDriverConsecutiveWorkDays, getDriverWorkDays } from '../../services/firestoreService';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';

const DriverDetail = () => {
  const { name } = useParams();
  const [driver, setDriver] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [workDays, setWorkDays] = useState({ totalWorkDays: 0, scheduleCount: 0 });
  const [consecutiveData, setConsecutiveData] = useState({ maxConsecutiveDays: 0, hasLongWorkPeriod: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 日付フォーマットのヘルパー関数
  const formatDateStr = (dateStr) => {
    if (!dateStr) return '';
    
    let date;
    if (dateStr instanceof Date) {
      date = dateStr;
    } else if (typeof dateStr === 'string') {
      // YYYY/MM/DD形式またはYYYY-MM-DD形式をサポート
      if (dateStr.includes('/')) {
        const [year, month, day] = dateStr.split('/').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateStr);
      }
    } else if (dateStr && typeof dateStr.toDate === 'function') {
      // Firestoreのタイムスタンプの場合
      date = dateStr.toDate();
    }
    
    if (!date || isNaN(date.getTime())) {
      console.log(`無効な日付形式: ${dateStr}`);
      return String(dateStr);
    }
    
    return format(date, 'yyyy年MM月dd日(E)', { locale: ja });
  };

  // ドライバー情報の取得
  useEffect(() => {
    const fetchDriverData = async () => {
      setLoading(true);
      try {
        // ドライバー情報を取得
        const driverInfo = await getDriverByName(decodeURIComponent(name));
        
        if (!driverInfo) {
          setError(`ドライバー「${decodeURIComponent(name)}」が見つかりません。`);
          setLoading(false);
          return;
        }
        
        setDriver(driverInfo);
        
        // ドライバーのスケジュールを取得
        const schedulesData = await getDriverSchedules(decodeURIComponent(name), 4);
        setSchedules(schedulesData);
        
        // 勤務日数を取得
        const workDaysData = await getDriverWorkDays(decodeURIComponent(name));
        setWorkDays(workDaysData);
        
        // 連続勤務状況を取得
        const consecutiveData = await checkDriverConsecutiveWorkDays(decodeURIComponent(name));
        setConsecutiveData(consecutiveData);
        
        setLoading(false);
      } catch (err) {
        console.error('ドライバー情報取得エラー:', err);
        setError('ドライバー情報の取得中にエラーが発生しました。');
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [name]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link 
          to="/drivers"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', color: '#1890ff' }}
        >
          ← ドライバー一覧に戻る
        </Link>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>読み込み中...</div>
      ) : error ? (
        <div style={{ color: 'red', padding: '20px' }}>{error}</div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
            <h1 style={{ margin: 0 }}>{driver.name}</h1>
            <div style={{
              padding: '6px 12px',
              borderRadius: '16px',
              backgroundColor: driver.isActive ? '#d9f7be' : '#ffccc7',
              color: driver.isActive ? '#389e0d' : '#cf1322',
              fontWeight: 'bold'
            }}>
              {driver.isActive ? '有効' : '無効'}
            </div>
          </div>
          
          {/* 連続勤務情報 */}
          {consecutiveData.hasLongWorkPeriod && (
            <div style={{
              margin: '20px 0',
              padding: '15px',
              backgroundColor: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: '4px',
              color: '#cf1322'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ marginRight: '8px', fontSize: '20px' }}>⚠️</span>
                <span style={{ fontWeight: 'bold' }}>
                  連続勤務日数が6日以上あります ({consecutiveData.maxConsecutiveDays}日間)
                </span>
              </div>
              <div>連続勤務は労働安全衛生上の懸念があります。休日の確保を検討してください。</div>
            </div>
          )}
          
          {/* 基本情報 */}
          <div style={{ 
            backgroundColor: '#f0f2f5', 
            padding: '20px', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>ドライバー情報</h2>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>ドライバー名</div>
                <div>{driver.name}</div>
              </div>
              
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>直近30日間の勤務</div>
                <div>{workDays.totalWorkDays}日 ({workDays.scheduleCount}件の予約)</div>
              </div>
              
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>最大連続勤務</div>
                <div 
                  style={{ 
                    color: consecutiveData.maxConsecutiveDays >= 6 ? '#cf1322' : 'inherit',
                    fontWeight: consecutiveData.maxConsecutiveDays >= 6 ? 'bold' : 'normal'
                  }}
                >
                  {consecutiveData.maxConsecutiveDays}日間
                </div>
              </div>
            </div>
            
            {driver.memo && (
              <div style={{ marginTop: '15px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>備考</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{driver.memo}</div>
              </div>
            )}
          </div>
          
          {/* 今後のスケジュール */}
          <div>
            <h2 style={{ fontSize: '18px' }}>今後4日間のスケジュール</h2>
            
            {schedules.length === 0 ? (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                backgroundColor: '#f9f9f9',
                borderRadius: '4px'
              }}>
                今後4日間の予約はありません
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>日程</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>団体名</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>行き先</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>バス</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map(schedule => (
                    <tr key={schedule.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px' }}>
                        {formatDateStr(schedule.departureDate)}
                        {schedule.span > 1 && ` (${schedule.span}日間)`}
                      </td>
                      <td style={{ padding: '12px' }}>{schedule.groupName || (schedule.content?.groupName || '-')}</td>
                      <td style={{ padding: '12px' }}>{schedule.destination || (schedule.content?.areaInfo || '-')}</td>
                      <td style={{ padding: '12px' }}>{schedule.busName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDetail;