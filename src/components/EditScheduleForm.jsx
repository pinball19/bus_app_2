// src/components/EditScheduleForm.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ColorSelector from './ColorSelector';
import { defaultStyles, getMessagesForSchedule, addMessageToSchedule, getDrivers } from '../services/firestoreService';
import { format } from 'date-fns';
import MessageList from './messages/MessageList';
import MessageInput from './messages/MessageInput';

// 日付フォーマットのヘルパー関数
const formatDateForInput = (year, month, day) => {
  // 月と日が一桁の場合は先頭に0を付ける
  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  // yyyy-MM-dd形式に変換
  return `${year}-${formattedMonth}-${formattedDay}`;
};

// 曜日を取得する関数
const getWeekday = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  // 日本語の曜日
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekdayIndex = date.getDay();
  return weekdays[weekdayIndex];
};

// 曜日の色を取得する関数
const getWeekdayColor = (dateString) => {
  if (!dateString) return 'inherit';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'inherit';
  
  const weekdayIndex = date.getDay();
  
  // 日曜は赤、土曜は青、その他は黒
  if (weekdayIndex === 0) return '#ff0000'; // 日曜
  if (weekdayIndex === 6) return '#0000ff'; // 土曜
  return '#333333'; // 平日
};

// 表示用のフィールド設定
const displayFields = [
  { key: 'departureDate', label: '出発日' },
  { key: 'groupName', label: '団体名' },
  { key: 'destination', label: '行き先' },
  { key: 'companyName', label: '依頼会社' },
  { key: 'price', label: '料金' },
  { key: 'driverName', label: 'ドライバー名' },
  { key: 'memo', label: '備考' }
];

const EditScheduleForm = ({ schedule, onUpdate, onCancel }) => {
  // ナビゲーション
  const navigate = useNavigate();
  
  // デバッグ用のref
  const departureDateRef = useRef(null);
  const returnDateRef = useRef(null);
  
  // ドライバー一覧
  const [drivers, setDrivers] = useState([]);
  
  // フォームデータの状態 - スタイル情報を追加
  const [formData, setFormData] = useState({
    orderDate: '',
    departureDate: '',
    returnDate: '',
    groupName: '',
    destination: '',
    companyName: '', // 依頼会社
    passengers: '',
    price: '',
    contactPerson: '', // 既存フィールド（将来的には削除予定）
    driverName: '', // ドライバー名（新規フィールド）
    contactInfo: '',
    busType: 'マイクロ',
    paymentMethod: '', // 清算方法
    itineraryReceived: false, // 行程表到着
    paymentCompleted: false, // 清算終了
    memo: '',
    span: 1,
    styles: { ...defaultStyles } // デフォルトのスタイル情報
  });

  // スタイル編集モード
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  
  // チャット機能用の状態
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('ユーザー'); // デフォルトユーザー名
  const chatContainerRef = useRef(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // 初回レンダリング時に既存データをフォームにセット
  useEffect(() => {
    if (schedule && schedule.schedule && schedule.schedule.content) {
      console.log('編集フォームに読み込まれたスケジュールデータ:', schedule);
      
      const { content, span, day, styles } = schedule.schedule;
      
      // スケジュールIDが存在する場合はメッセージも取得
      if (schedule.schedule.id) {
        setLoadingMessages(true);
        getMessagesForSchedule(schedule.schedule.id)
          .then(fetchedMessages => {
            console.log('取得したメッセージ:', fetchedMessages);
            setMessages(fetchedMessages);
            setLoadingMessages(false);
            
            // スクロール不要
          })
          .catch(error => {
            console.error('メッセージ取得エラー:', error);
            setLoadingMessages(false);
          });
      }
      
      let validDay = parseInt(day);
      if (isNaN(validDay) || validDay < 1 || validDay > 31) {
        console.warn(`無効な日付 (${day}) を検出したため、1日に修正しました`);
        validDay = 1;
      }
      
      const departureDateParts = content.departureDate ? content.departureDate.split('/') : [];
      let departureYear, departureMonth;
      
      if (departureDateParts.length >= 2) {
        departureYear = parseInt(departureDateParts[0]);
        departureMonth = parseInt(departureDateParts[1]);
      } else {
        const today = new Date();
        departureYear = today.getFullYear();
        departureMonth = today.getMonth() + 1;
      }
      
      let departureDateStr = '';
      if (content.departureDate) {
        const parts = content.departureDate.split('/');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          departureDateStr = formatDateForInput(year, month, day);
        } else {
          departureDateStr = formatDateForInput(departureYear, departureMonth, validDay);
        }
      } else {
        departureDateStr = formatDateForInput(departureYear, departureMonth, validDay);
      }
      
      const depDate = new Date(departureDateStr);
      const returnDate = new Date(depDate);
      returnDate.setDate(depDate.getDate() + (span - 1));
      const returnDateStr = returnDate.toISOString().split('T')[0];
      
      let busType = 'マイクロ';
      if (content.memo) {
        if (content.memo.includes('小型')) busType = '小型';
        else if (content.memo.includes('中型')) busType = '中型';
        else if (content.memo.includes('大型')) busType = '大型';
        else if (content.memo.includes('マイクロ')) busType = 'マイクロ';
      }
      
      // スタイル情報の取得 - スケジュールデータまたはデフォルト値から
      const styleData = styles || {
        // スタイル情報をフィールドに合わせて変換
        departureDate: { bgColor: "#e6f7ff", textColor: "#1890ff" },
        groupName: { bgColor: "#ffffff", textColor: "#000000" },
        destination: { bgColor: "#ffffff", textColor: "#000000" },
        companyName: { bgColor: "#ffffff", textColor: "#000000" },
        price: { bgColor: "#ffffff", textColor: "#000000" },
        driverName: { bgColor: "#ffffff", textColor: "#000000" },
        memo: { bgColor: "#ffffff", textColor: "#000000" }
      };
      
      const updatedFormData = {
        orderDate: content.orderDate || '',
        departureDate: departureDateStr,
        returnDate: returnDateStr,
        groupName: content.groupName || '',
        destination: content.areaInfo || '',
        companyName: content.companyName || '', // 依頼会社
        passengers: content.passengers || '',
        price: content.price || '',
        contactPerson: content.travelAgency || '', // 既存フィールド
        driverName: content.driverName || '', // ドライバー名
        contactInfo: content.driver || '',
        busType: busType,
        paymentMethod: content.paymentMethod || '', // 清算方法
        itineraryReceived: content.itineraryReceived || false, // 行程表到着
        paymentCompleted: content.paymentCompleted || false, // 清算終了
        memo: content.memo || '',
        span: span || 1,
        year: departureYear,
        month: departureMonth,
        styles: styleData // スタイル情報を追加
      };
      
      console.log('フォームデータを設定:', updatedFormData);
      
      setTimeout(() => {
        setFormData(updatedFormData);
      }, 0);
    }
  }, [schedule]);
  // ドライバー一覧を取得
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const driversList = await getDrivers(true); // アクティブなドライバーのみ
        setDrivers(driversList);
      } catch (error) {
        console.error('ドライバー一覧取得エラー:', error);
      }
    };
    
    fetchDrivers();
  }, []);

  // フォームデータが更新されたときにカレンダー入力フィールドの動作確認
  useEffect(() => {
    console.log('フォームデータが更新されました:', formData);
    
    // 日付入力フィールドのデバッグログ
    if (departureDateRef.current) {
      console.log('出発日入力要素:', departureDateRef.current);
      console.log('出発日入力値:', departureDateRef.current.value);
      
      // 値が設定されていない場合は強制的に設定
      if (formData.departureDate && departureDateRef.current.value !== formData.departureDate) {
        departureDateRef.current.value = formData.departureDate;
      }
    }
    
    if (returnDateRef.current) {
      console.log('帰着日入力要素:', returnDateRef.current);
      console.log('帰着日入力値:', returnDateRef.current.value);
      
      // 値が設定されていない場合は強制的に設定
      if (formData.returnDate && returnDateRef.current.value !== formData.returnDate) {
        returnDateRef.current.value = formData.returnDate;
      }
    }
  }, [formData]);

  // 入力フィールドの変更を処理
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    console.log(`フィールド ${name} の値が変更されました: ${value}`);
    
    // 新規ドライバー追加が選択された場合
    if (name === 'contactPerson' && value === '__add_new__') {
      navigate('/drivers/add');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // 出発日変更時に帰着日を自動設定
  const handleDepartureDateChange = (e) => {
    const departureDate = e.target.value;
    console.log(`出発日が変更されました: ${departureDate}`);
    
    // 帰着日をデフォルトで出発日と同じに設定
    let returnDate = departureDate;
    
    // フォームデータを更新
    setFormData(prev => ({
      ...prev,
      departureDate,
      returnDate
    }));
  };

  // 帰着日変更時の処理
  const handleReturnDateChange = (e) => {
    const returnDate = e.target.value;
    console.log(`帰着日が変更されました: ${returnDate}`);
    
    // 帰着日が出発日より前の場合は警告
    if (formData.departureDate && returnDate < formData.departureDate) {
      alert('帰着日は出発日以降の日付を設定してください。');
      return;
    }
    
    // 日付の差分を計算し、予約日数を自動設定
    if (formData.departureDate && returnDate) {
      const depDate = new Date(formData.departureDate);
      const retDate = new Date(returnDate);
      const diffTime = Math.abs(retDate - depDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      console.log(`出発日と帰着日の差: ${diffDays}日`);
      
      // フォームデータを更新
      setFormData(prev => ({
        ...prev,
        returnDate,
        span: diffDays
      }));
    } else {
      // 出発日が設定されていない場合は帰着日のみ更新
      setFormData(prev => ({
        ...prev,
        returnDate
      }));
    }
  };

  // 日付入力フィールドを直接クリックした時のハンドラ
  const handleDateClick = (e) => {
    console.log(`日付入力フィールド ${e.target.name} がクリックされました`);
    // 強制的にフォーカス
    e.target.focus();
    
    // カレンダーを表示させるためにクリックイベントをシミュレート
    try {
      e.target.showPicker();
    } catch (err) {
      console.error("カレンダーピッカーの表示に失敗しました:", err);
    }
  };

  // スタイル変更ハンドラー
  const handleStyleChange = (fieldName, bgColor, textColor) => {
    console.log(`${fieldName}のスタイルを変更: 背景=${bgColor}, 文字=${textColor}`);
    
    setFormData(prev => ({
      ...prev,
      styles: {
        ...prev.styles,
        [fieldName]: {
          bgColor,
          textColor
        }
      }
    }));
  };

  // チャットメッセージ送信処理
  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || !schedule.schedule.id) {
      return false;
    }
    
    const messageData = {
      text: messageText.trim(),
      username: username.trim() || 'ユーザー',
      type: 'user'
    };
    
    try {
      // メッセージを送信
      await addMessageToSchedule(schedule.schedule.id, messageData);
      
      // メッセージリストを更新
      const updatedMessages = await getMessagesForSchedule(schedule.schedule.id);
      setMessages(updatedMessages);
      
      return true;
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      alert('メッセージの送信に失敗しました。');
      return false;
    }
  };
  
  // ユーザー名変更処理
  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
  };
  // フォーム送信処理
  const handleSubmit = async (e, stayOnPage = true) => { // デフォルトでページに留まるように変更
    e.preventDefault();
    setLoadingMessages(true); // ローディング状態にする
    
    // 入力要素から直接値を取得して更新
    if (departureDateRef.current && departureDateRef.current.value) {
      formData.departureDate = departureDateRef.current.value;
    }
    
    if (returnDateRef.current && returnDateRef.current.value) {
      formData.returnDate = returnDateRef.current.value;
    }
    
    // 出発日と帰着日から予約日数を計算
    let span = 1;
    if (formData.departureDate && formData.returnDate) {
      const depDate = new Date(formData.departureDate);
      const retDate = new Date(formData.returnDate);
      const diffTime = Math.abs(retDate - depDate);
      span = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      console.log(`出発日と帰着日から計算された予約日数: ${span}日`);
      
      // formDataのspanを上書き
      formData.span = span;
    }
    
    console.log('更新するデータ:', formData);
    
    // 更新データを作成
    const updatedData = {
      ...formData,
      span: span,
      busName: schedule.busName,
      day: schedule.schedule.day,
      id: schedule.schedule.id || Date.now().toString(), // IDがなければ新規作成
      styles: formData.styles, // スタイル情報を追加
      month: new Date(formData.departureDate).getMonth() + 1, // 月を適切に設定
      year: new Date(formData.departureDate).getFullYear() // 年を適切に設定
    };
    
    console.log('更新後データ:', updatedData);
    console.log('ページ維持フラグ:', stayOnPage);
    
    try {
      // 更新処理を実行
      await onUpdate(updatedData, null, stayOnPage);
      
      // 更新後、メッセージを再取得して表示を更新（500ms待機して確実に変更が反映されるようにする）
      setTimeout(async () => {
        if (schedule.schedule.id) {
          try {
            const fetchedMessages = await getMessagesForSchedule(schedule.schedule.id);
            console.log('更新後のメッセージ:', fetchedMessages);
            setMessages(fetchedMessages);
          } catch (error) {
            console.error('メッセージ再取得エラー:', error);
          } finally {
            setLoadingMessages(false);
          }
        } else {
          setLoadingMessages(false);
        }
      }, 500);
    } catch (error) {
      console.error('更新処理エラー:', error);
      setLoadingMessages(false);
    }
  };

  // 削除ボタンの処理
  const handleDelete = () => {
    if (window.confirm('この予約を削除してもよろしいですか？')) {
      // スケジュールの削除処理
      onUpdate({ delete: true, id: schedule.schedule.id });
    }
  };

  // スタイルプレビューコンポーネント
  const StylePreview = () => (
    <div className="style-preview">
      <h4>スタイルプレビュー</h4>
      {displayFields.map(field => (
        <div
          key={field.key}
          className="preview-row"
          style={{
            backgroundColor: formData.styles[field.key]?.bgColor || '#ffffff',
            color: formData.styles[field.key]?.textColor || '#000000'
          }}
        >
          {field.label}：{
            field.key === 'departureDate' 
              ? formData.departureDate 
              : formData[field.key === 'travelAgency' ? 'contactPerson' : 
                         field.key === 'driver' ? 'contactInfo' : field.key] || '（サンプルテキスト）'
          }
        </div>
      ))}
    </div>
  );
  return (
    <div className="form-container">
      <div className="form-header">
        <h2 className="form-title">予約詳細編集</h2>
        <div>
          {schedule.busName} / {schedule.schedule.day}日
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="orderDate">受注日</label>
          <div className="date-with-weekday">
            <div className="weekday-display" style={{ color: getWeekdayColor(formData.orderDate) }}>
              {getWeekday(formData.orderDate)}曜日
            </div>
            <input
              type="date"
              id="orderDate"
              name="orderDate"
              value={formData.orderDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="departureDate">出発日</label>
            <div className="date-with-weekday">
              <div className="weekday-display" style={{ color: getWeekdayColor(formData.departureDate) }}>
                {getWeekday(formData.departureDate)}曜日
              </div>
              <input
                type="date"
                id="departureDate"
                name="departureDate"
                value={formData.departureDate}
                onChange={handleDepartureDateChange}
                onClick={handleDateClick}
                ref={departureDateRef}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="returnDate">帰着日</label>
            <div className="date-with-weekday">
              <div className="weekday-display" style={{ color: getWeekdayColor(formData.returnDate) }}>
                {getWeekday(formData.returnDate)}曜日
              </div>
              <input
                type="date"
                id="returnDate"
                name="returnDate"
                value={formData.returnDate}
                onChange={handleReturnDateChange}
                onClick={handleDateClick}
                ref={returnDateRef}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="groupName">団体名</label>
          <input
            type="text"
            id="groupName"
            name="groupName"
            value={formData.groupName}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="destination">行き先</label>
          <input
            type="text"
            id="destination"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="companyName">依頼会社</label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="例: ○○旅行"
          />
        </div>

        <div className="form-group">
          <label htmlFor="passengers">人数</label>
          <input
            type="text"
            id="passengers"
            name="passengers"
            value={formData.passengers}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="price">料金（見積もり/確定）</label>
          <input
            type="text"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="driverName">ドライバー名</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select
              id="driverName"
              name="driverName"
              value={formData.driverName}
              onChange={handleChange}
              style={{ flex: 1, padding: '8px' }}
            >
              <option value="">選択してください</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.name}>{driver.name}</option>
              ))}
              <option value="__add_new__">＋新規ドライバーを追加</option>
            </select>
            {formData.driverName && formData.driverName !== '__add_new__' && (
              <Link
                to={`/drivers/${encodeURIComponent(formData.driverName)}`}
                style={{
                  marginLeft: '10px',
                  textDecoration: 'none',
                  color: '#1890ff',
                  fontSize: '14px',
                  padding: '5px 10px',
                  border: '1px solid #1890ff',
                  borderRadius: '4px'
                }}
              >
                詳細
              </Link>
            )}
            <button
              type="button"
              onClick={() => navigate('/drivers/add')}
              style={{
                marginLeft: '10px',
                padding: '5px 10px',
                backgroundColor: '#52c41a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              新規
            </button>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="contactInfo">連絡先・メール</label>
          <input
            type="text"
            id="contactInfo"
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="busType">車種情報</label>
          <select
            id="busType"
            name="busType"
            value={formData.busType}
            onChange={handleChange}
          >
            <option value="マイクロ">マイクロ</option>
            <option value="小型">小型</option>
            <option value="中型">中型</option>
            <option value="大型">大型</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="itineraryReceived">行程表到着</label>
          <div 
            className={`checkbox-container ${formData.itineraryReceived ? 'checked' : ''}`}
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                itineraryReceived: !prev.itineraryReceived
              }));
            }}
          >
            <label className="checkbox-label" htmlFor="itineraryReceived">
              <input
                type="checkbox"
                id="itineraryReceived"
                name="itineraryReceived"
                checked={formData.itineraryReceived}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    itineraryReceived: e.target.checked
                  }));
                }}
              />
              {formData.itineraryReceived ? (
                <span className="checkbox-text-checked">行程表が到着済みです ✓</span>
              ) : (
                <span className="checkbox-text-unchecked">行程表は未着です</span>
              )}
            </label>
            
            {/* 出発日の21日前のアラート表示 */}
            {formData.departureDate && !formData.itineraryReceived && (() => {
              const departureDate = new Date(formData.departureDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              // 出発の21日前
              const deadlineDate = new Date(departureDate);
              deadlineDate.setDate(deadlineDate.getDate() - 21);
              
              // 今日が締切日以降かつ出発日前
              if (today >= deadlineDate && today < departureDate) {
                return (
                  <div style={{ 
                    marginLeft: '15px', 
                    color: '#f5222d', 
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center' 
                  }}>
                    <span style={{ marginRight: '5px' }}>⚠️</span>
                    <span>出発21日前を過ぎています！</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="paymentMethod">清算</label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
          >
            <option value="">選択してください</option>
            <option value="OATA">OATA</option>
            <option value="全旅">全旅</option>
            <option value="現金">現金</option>
            <option value="その他">その他</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="paymentCompleted">清算終了</label>
          <div 
            className={`checkbox-container ${formData.paymentCompleted ? 'checked' : ''}`}
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                paymentCompleted: !prev.paymentCompleted
              }));
            }}
          >
            <label className="checkbox-label" htmlFor="paymentCompleted">
              <input
                type="checkbox"
                id="paymentCompleted"
                name="paymentCompleted"
                checked={formData.paymentCompleted}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    paymentCompleted: e.target.checked
                  }));
                }}
              />
              {formData.paymentCompleted ? (
                <span className="checkbox-text-checked">清算は完了済みです ✓（カレンダー上でグレーアウト表示されます）</span>
              ) : (
                <span className="checkbox-text-unchecked">清算は未完了です</span>
              )}
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="memo">備考欄</label>
          <textarea
            id="memo"
            name="memo"
            value={formData.memo}
            onChange={handleChange}
          />
        </div>

        {/* スタイル編集セクション - 新規追加 */}
        <div className="form-group" style={{marginTop: '20px'}}>
          <button 
            type="button" 
            className="secondary-button"
            style={{backgroundColor: '#1890ff', marginBottom: '10px'}}
            onClick={() => setShowStyleEditor(!showStyleEditor)}
          >
            {showStyleEditor ? 'スタイル編集を閉じる' : 'セル内の色を編集する'}
          </button>
          
          {showStyleEditor && (
            <div className="style-editor">
              <h3>セル内の色設定</h3>
              <p>各行の背景色と文字色を設定できます</p>
              
              {/* スタイルプレビュー */}
              <StylePreview />
              
              {/* 各行の色選択 */}
              {displayFields.map(field => (
                <ColorSelector
                  key={field.key}
                  fieldName={field.key}
                  currentStyle={formData.styles[field.key]}
                  onChange={handleStyleChange}
                />
              ))}
            </div>
          )}
        </div>

        <div className="button-group">
          <div>
            <button type="button" className="cancel-button" onClick={onCancel}>
              キャンセル
            </button>
            <button 
              type="button" 
              className="secondary-button" 
              onClick={handleDelete}
              style={{ marginLeft: '10px' }}
            >
              削除
            </button>
          </div>
          <button 
            type="submit" 
            className="primary-button"
            onClick={(e) => {
              e.preventDefault(); // フォームの自動送信を防止
              handleSubmit(e, true); // stayOnPage=true でフォーム送信
            }}
          >
            更新する
          </button>
        </div>
      </form>
      
      {/* チャット機能 */}
      <div className="chat-section" style={{
        marginTop: '30px', 
        border: '1px solid #ddd', 
        borderRadius: '5px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h3 style={{
          padding: '10px 15px', 
          backgroundColor: '#f5f5f5', 
          margin: '0', 
          borderBottom: '1px solid #ddd'
        }}>
          メッセージ / 連絡事項
        </h3>
        
        <MessageList
          messages={messages}
          loading={loadingMessages}
        />
        
        <MessageInput
          username={username}
          onUsernameChange={handleUsernameChange}
          onSendMessage={handleSendMessage}
        />
      </div>
      
    </div>
  );
};

export default EditScheduleForm;
