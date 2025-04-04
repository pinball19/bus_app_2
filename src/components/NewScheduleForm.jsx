// src/components/NewScheduleForm.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ColorSelector from './ColorSelector';
import { defaultStyles, getDrivers } from '../services/firestoreService';

// 日付フォーマットのヘルパー関数
const formatDateForInput = (year, month, day) => {
  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  return `${year}-${formattedMonth}-${formattedDay}`;
};

// 曜日を取得する関数
const getWeekday = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return weekdays[date.getDay()];
};

// 曜日の色を取得する関数
const getWeekdayColor = (dateString) => {
  if (!dateString) return 'inherit';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'inherit';
  
  const weekdayIndex = date.getDay();
  
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

const NewScheduleForm = ({ selectedCell, onSave, onCancel }) => {
  // ナビゲーション
  const navigate = useNavigate();
  
  // デバッグ用のref
  const departureDateRef = useRef(null);
  const returnDateRef = useRef(null);
  
  // 初期値設定 - 受注日のみ今日の日付に
  const today = new Date();
  const todayFormatted = formatDateForInput(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
  
  // ドライバー一覧
  const [drivers, setDrivers] = useState([]);
  
  // フォームデータの状態 - スタイル情報を追加
  const [formData, setFormData] = useState({
    orderDate: todayFormatted,
    departureDate: '',
    returnDate: '',
    groupName: '',
    destination: '',
    companyName: '', // 依頼会社
    passengers: '',
    price: '',
    driverName: '', // ドライバー名
    contactPerson: '', // 互換性のために残す
    contactInfo: '',
    busType: '',
    paymentMethod: '', // 清算方法
    itineraryReceived: false, // 行程表到着
    paymentCompleted: false, // 清算終了
    memo: '',
    span: 1,
    styles: { ...defaultStyles } // デフォルトのスタイル情報
  });
  
  // スタイル編集モード
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  
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
  
  // 選択したセルの情報から日付のみを設定 (バス名は設定しない)
  useEffect(() => {
    if (selectedCell && selectedCell.day !== undefined) {
      console.log('選択されたセル情報:', selectedCell);
      
      // 日付の検証と変換
      const validDay = parseInt(selectedCell.day);
      if (isNaN(validDay) || validDay < 1 || validDay > 31) {
        console.warn(`無効な日付 (${selectedCell.day}) を使用しています`);
      }
      
      // セルから年月を取得（選択されている月を使用）
      const selectedYear = selectedCell.year || today.getFullYear();
      const selectedMonth = selectedCell.month || today.getMonth() + 1;
      
      console.log(`選択された年月: ${selectedYear}年${selectedMonth}月${validDay}日`);
      
      // 日付文字列を作成
      const departureDateStr = formatDateForInput(selectedYear, selectedMonth, validDay);
      console.log(`選択した日付から生成した出発日: ${departureDateStr}`);
      
      // 帰着日を計算 (出発日と同じ - 予約日数が1の場合)
      const returnDateStr = departureDateStr;
      
      // 時間差をおいて日付情報のみを更新
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          departureDate: departureDateStr,
          returnDate: returnDateStr
        }));
      }, 0);
    }
  }, [selectedCell]);
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

  // 帰着日と出発日の有効性チェック
  const validateDates = () => {
    if (!formData.departureDate || !formData.returnDate) {
      return true; // 日付が設定されていない場合はチェックしない
    }
    
    const depDate = new Date(formData.departureDate);
    const retDate = new Date(formData.returnDate);
    
    // 帰着日が出発日より前の場合
    if (retDate < depDate) {
      alert('帰着日は出発日以降の日付を設定してください。');
      return false;
    }
    
    // 日付の差分を計算し、予約日数を自動設定
    const diffTime = Math.abs(retDate - depDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`出発日と帰着日の差: ${diffDays}日`);
    setFormData(prev => ({
      ...prev,
      span: diffDays
    }));
    
    return true;
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

  // フォーム送信処理
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 日付の検証
    if (!validateDates()) {
      return;
    }
    
    // 入力要素から直接値を取得して更新
    if (departureDateRef.current && departureDateRef.current.value) {
      formData.departureDate = departureDateRef.current.value;
    }
    
    if (returnDateRef.current && returnDateRef.current.value) {
      formData.returnDate = returnDateRef.current.value;
    }
    
    console.log('送信されるデータ:', formData);
    
    // セル情報と入力データを結合
    const scheduleData = {
      ...formData,
      busName: selectedCell.busName,
      day: selectedCell.day,
      month: selectedCell.month,
      year: selectedCell.year,
      styles: formData.styles // スタイル情報を追加
    };
    
    onSave(scheduleData);
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
        <h2 className="form-title">新規予約登録</h2>
        <div>
          {selectedCell?.busName} / {selectedCell?.year}年{selectedCell?.month}月{selectedCell?.day}日
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
              required
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
                onChange={handleChange}
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
            placeholder="例: ○○高校 修学旅行"
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
            placeholder="例: 大阪市内 → 京都"
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
            placeholder="例: 45名"
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
            placeholder="例: 45,000円"
          />
        </div>

        <div className="form-group">
          <label htmlFor="driverName">ドライバー名</label>
          <div style={{ display: 'flex' }}>
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
            <button
              type="button"
              onClick={() => navigate('/drivers/add')}
              style={{
                marginLeft: '10px',
                padding: '8px 12px',
                backgroundColor: '#52c41a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              新規追加
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
            placeholder="例: 090-1234-5678 / yamada@example.com"
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
            <option value="">選択してください</option>
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
            placeholder="例: バスガイドあり、雨天時はキャンセルあり等"
          />
        </div>

        {/* スタイル編集セクション */}
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
          <button type="button" className="cancel-button" onClick={onCancel}>
            キャンセル
          </button>
          <button type="submit" className="primary-button">
            登録する
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewScheduleForm;
