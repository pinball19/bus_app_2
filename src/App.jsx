import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./App.css";
import NewScheduleForm from "./components/NewScheduleForm";
import EditScheduleForm from "./components/EditScheduleForm";
import { 
  getSchedules, 
  addScheduleWithStyles, // 拡張された関数を使用
  updateScheduleWithStyles, // 拡張された関数を使用
  deleteSchedule,
  getSchedulesByBus,
  getSchedulesByContactPerson,
  getSchedulesForCSVWithStyles, // 拡張された関数を使用
  setupRealtimeListener, // 新規追加: リアルタイムリスナー
  detectAlerts, // 新規追加: アラート検出
  getDrivers // ドライバー一覧取得
} from "./services/firestoreService";
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';

// 指定された年月の日数を取得する関数
const getDaysInMonth = (year, month) => {
  // 翌月の0日目（つまり前月の最終日）を指定
  return new Date(year, month, 0).getDate();
};

// 指定した年月日の曜日を取得する関数
const getWeekday = (year, month, day) => {
  const date = new Date(year, month - 1, day);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return {
    text: weekdays[date.getDay()],
    isWeekend: date.getDay() === 0 || date.getDay() === 6, // 土日判定
    isSunday: date.getDay() === 0, // 日曜判定
    isSaturday: date.getDay() === 6 // 土曜判定
  };
};

// CSVダウンロード関数
const downloadCSV = (data, filename) => {
  // CSVヘッダー
  const headers = Object.keys(data[0]);
  
  // データ行の作成
  const csvRows = [
    headers.join(','), // ヘッダー行
    ...data.map(row => 
      headers.map(header => 
        // カンマを含む場合はダブルクォートで囲む
        String(row[header] || '').includes(',') 
          ? `"${row[header]}"`
          : row[header]
      ).join(',')
    )
  ];
  
  // CSVデータを作成
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  // ダウンロードリンクを作成
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // リンクをクリックしてダウンロード
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 各行のマッピング定義（セル内のフィールドとスタイルのマッピング）
const cellFieldsMap = {
  departureDate: 'departureDate', // 出発日
  groupName: 'groupName',         // 団体名
  destination: 'areaInfo',        // 行き先
  companyName: 'companyName',     // 依頼会社
  price: 'price',                 // 料金
  driverName: 'driverName',       // ドライバー名
  memo: 'memo'                    // 備考
};

function App() {
  // ナビゲーション
  const navigate = useNavigate();
  
  // 状態管理
  const [currentView, setCurrentView] = useState("calendar"); // calendar, newForm, editForm
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [scheduleData, setScheduleData] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterBus, setFilterBus] = useState(null);
  const [filterContactPerson, setFilterContactPerson] = useState(null);
  const [busNames, setBusNames] = useState([
    "マイクロ1", "マイクロ2", "小型1", "小型2", "中型1", "大型1"
  ]);
  const [contactPersons, setContactPersons] = useState([]);
  const [realtimeListener, setRealtimeListener] = useState(null); // リアルタイムリスナー
  const [alerts, setAlerts] = useState([]); // アラート情報
  const [editingBusName, setEditingBusName] = useState(null); // バス名編集状態
  const [editBusNameValue, setEditBusNameValue] = useState(""); // 編集中のバス名値
  const [updateModalVisible, setUpdateModalVisible] = useState(false); // 更新モーダル表示状態
  
  // 現在選択されている月の日数を計算
  const daysInSelectedMonth = getDaysInMonth(currentYear, currentMonth);
  
  // 日数の配列を生成（選択した月の実際の日数に基づく）
  const daysArray = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);

  // データを整理する関数をメモ化
  const organizeScheduleData = useCallback((data) => {
    return busNames.map(busName => {
      // 該当バス名のスケジュールを抽出
      const busSchedules = data.filter(item => item.busName === busName);
      
      return {
        busName,
        schedule: busSchedules.map(item => {
          // dayフィールドの値がおかしい場合の対処
          let day = parseInt(item.day);
          if (isNaN(day) || day < 1) {
            console.warn(`無効な日付 (${item.day}) を検出したため、1日に修正しました`);
            day = 1;
          } else if (day > getDaysInMonth(currentYear, currentMonth)) {
            // 選択された月の最終日を超える場合、その月の最終日に設定
            console.warn(`日付 ${day} が${currentMonth}月の最終日を超えています。最終日に設定します。`);
            day = getDaysInMonth(currentYear, currentMonth);
          }
          
          // 予約日数のバリデーション（選択した月の最終日までに収める）
          let span = parseInt(item.span) || 1;
          if (isNaN(span) || span < 1) {
            span = 1;
          }
          
          // 月末までの残り日数
          const daysLeftInMonth = getDaysInMonth(currentYear, currentMonth) - day + 1;
          
          // spanが月末を超える場合は調整
          if (span > daysLeftInMonth) {
            console.warn(`予約期間 ${span}日が月末を超えるため、${daysLeftInMonth}日に調整します。`);
            span = daysLeftInMonth;
          }
          
          // 日付情報のフォーマット
          let departureDateStr = '';
          if (item.departureDate && typeof item.departureDate.toDate === 'function') {
            // Timestampから日付変換
            departureDateStr = format(item.departureDate.toDate(), 'yyyy/MM/dd');
          } else if (item.departureDate instanceof Date) {
            // Date型の場合
            departureDateStr = format(item.departureDate, 'yyyy/MM/dd');
          } else {
            // 手動で日付を生成（有効な日付を使用）
            const validDateObj = new Date(currentYear, currentMonth - 1, day);
            departureDateStr = format(validDateObj, 'yyyy/MM/dd');
          }
          
          // 車種情報は別フィールドとして扱う
          let memoText = item.memo || '';
          let busTypeText = item.busType || '';
          
          return {
            id: item.id,
            day: day,
            span: span, // 検証済みの予約日数
            content: {
              orderDate: item.orderDate || '',
              departureDate: departureDateStr,
              groupName: item.groupName || '',
              areaInfo: item.destination || '',
              companyName: item.companyName || '', // 依頼会社
              travelAgency: item.contactPerson || '',
              driverName: item.driverName || '', // ドライバー名
              price: item.price || '',
              driver: item.contactInfo || '',
              passengers: item.passengers || '', // 人数
              busType: item.busType || '', // 車種
              paymentMethod: item.paymentMethod || '', // 清算方法
              itineraryReceived: item.itineraryReceived || false, // 行程表到着
              paymentCompleted: item.paymentCompleted || false, // 清算終了
              memo: item.memo || '', // 備考 - 車種情報を自動追加しない
            },
            styles: item.styles || null // スタイル情報を追加
          };
        })
      };
    });
  }, [busNames, currentMonth, currentYear]);

  // アラート検出処理
const checkAlerts = useCallback((data) => {
  console.log("アラート検出を実行します...");
  const detectedAlerts = detectAlerts(data);
  console.log("アラート検出結果:", detectedAlerts);
  
  if (detectedAlerts.length > 0) {
    console.log("アラートを検出:", detectedAlerts);
    setAlerts(detectedAlerts);
    console.log("アラート状態を更新しました");
  } else {
    console.log("アラートは検出されませんでした");
    setAlerts([]);
  }
}, []);
  // リアルタイム更新のハンドラー
  const handleRealtimeUpdate = useCallback((changes) => {
    console.log("リアルタイム更新を受信:", changes);
    
    // 現在のデータを更新
    setScheduleData(prevData => {
      // 変更を適用するために、データの深いコピーを作成
      const updatedData = JSON.parse(JSON.stringify(prevData));
      
      // 変更を処理
      changes.forEach(change => {
        const { type, data } = change;
        
        if (type === 'added' || type === 'modified') {
          // バスごとのデータを更新
          const busIndex = updatedData.findIndex(bus => bus.busName === data.busName);
          if (busIndex >= 0) {
            // 既存のスケジュールを更新または追加
            const scheduleIndex = updatedData[busIndex].schedule.findIndex(
              item => item.id === data.id
            );
            
            if (scheduleIndex >= 0) {
              // 既存のスケジュールを更新
              const updatedSchedule = {
                id: data.id,
                day: parseInt(data.day),
                span: parseInt(data.span) || 1,
                content: {
                  orderDate: data.orderDate || '',
                  departureDate: data.departureDate instanceof Date 
                    ? format(data.departureDate, 'yyyy/MM/dd')
                    : '',
                  groupName: data.groupName || '',
                  areaInfo: data.destination || '',
                  travelAgency: data.contactPerson || '',
                  price: data.price || '',
                  driver: data.contactInfo || '',
                  passengers: data.passengers || '', // 人数フィールドを追加
                  memo: data.memo || ''
                },
                styles: data.styles || null
              };
              
              // 車種情報を追加（既に含まれていない場合のみ）
              if (data.busType && !updatedSchedule.content.memo.includes(data.busType)) {
                updatedSchedule.content.memo = `${data.busType}${updatedSchedule.content.memo ? '・' + updatedSchedule.content.memo : ''}`;
              }
              
              updatedData[busIndex].schedule[scheduleIndex] = updatedSchedule;
            } else {
              // 新しいスケジュールを追加
              let memoText = data.memo || '';
              let busTypeText = data.busType || '';
              
              // 備考に車種情報が既に含まれていないときだけ追加
              if (busTypeText && !memoText.includes(busTypeText)) {
                memoText = busTypeText + (memoText ? '・' + memoText : '');
              }
              
              const newSchedule = {
                id: data.id,
                day: parseInt(data.day),
                span: parseInt(data.span) || 1,
                content: {
                  orderDate: data.orderDate || '',
                  departureDate: data.departureDate instanceof Date 
                    ? format(data.departureDate, 'yyyy/MM/dd')
                    : '',
                  groupName: data.groupName || '',
                  areaInfo: data.destination || '',
                  travelAgency: data.contactPerson || '',
                  price: data.price || '',
                  driver: data.contactInfo || '',
                  passengers: data.passengers || '', // 人数フィールドを追加
                  memo: memoText
                },
                styles: data.styles || null
              };
              
              updatedData[busIndex].schedule.push(newSchedule);
            }
          }
        } else if (type === 'removed') {
          // スケジュールの削除
          const busIndex = updatedData.findIndex(bus => bus.busName === data.busName);
          if (busIndex >= 0) {
            const scheduleIndex = updatedData[busIndex].schedule.findIndex(
              item => item.id === data.id
            );
            
            if (scheduleIndex >= 0) {
              updatedData[busIndex].schedule.splice(scheduleIndex, 1);
            }
          }
        }
      });
      
      // アラートの再チェック
      checkAlerts(updatedData);
      
      return updatedData;
    });
  }, [checkAlerts]);

  // 初回読み込み時とフィルター変更時にデータを取得
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // 既存のリスナーがあれば解除
      if (realtimeListener) {
        console.log("既存のリスナーを解除します");
        realtimeListener();
        setRealtimeListener(null);
      }
      
      try {
        let data;
        if (filterBus) {
          // バス名でフィルタリング
          data = await getSchedulesByBus(filterBus, currentMonth, currentYear);
        } else if (filterContactPerson) {
          // 担当者でフィルタリング
          data = await getSchedulesByContactPerson(filterContactPerson, currentMonth, currentYear);
        } else {
          // すべてのスケジュールを取得
          data = await getSchedules(currentMonth, currentYear);
        }

        console.log("Firestoreから取得したデータ:", data);

        // データをバス名ごとに整理
        const organizedData = organizeScheduleData(data);
        
        console.log("整理後のデータ:", organizedData);
        setScheduleData(organizedData);

        // 担当者リストを作成
        const persons = [...new Set(data.map(item => item.contactPerson).filter(Boolean))];
        setContactPersons(persons);
        
        // アラート検出（呼び出し前にログ出力を追加）
        console.log("アラート検出を実行します...");
        checkAlerts(organizedData);
        
        // リアルタイムリスナーをセットアップ（短い遅延を追加）
        setTimeout(() => {
          const unsubscribe = setupRealtimeListener(
            currentMonth, 
            currentYear, 
            handleRealtimeUpdate
          );
          
          setRealtimeListener(unsubscribe);
        }, 500);
        
        setLoading(false);
      } catch (err) {
        console.error("データ取得エラー:", err);
        setError("スケジュールデータの取得中にエラーが発生しました。");
        setLoading(false);
      }
    }

    fetchData();
    
    // コンポーネントのクリーンアップ時にリスナーを解除
    return () => {
      if (realtimeListener) {
        console.log("コンポーネントのアンマウント時にリスナーを解除します");
        realtimeListener();
      }
    };
  }, [currentMonth, currentYear, filterBus, filterContactPerson, organizeScheduleData, handleRealtimeUpdate, checkAlerts]);

  // 前月へ移動
  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // 翌月へ移動
  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // 空白セルクリック - 新規フォーム表示
  const handleEmptyCellClick = (busName, day) => {
    console.log(`空白セルがクリックされました: バス=${busName}, 日付=${day}, 月=${currentMonth}, 年=${currentYear}`);
    
    // 日付のバリデーション
    let validDay = parseInt(day);
    if (isNaN(validDay) || validDay < 1) {
      console.warn(`無効な日付 (${day}) を1日に修正します`);
      validDay = 1;
    } else if (validDay > getDaysInMonth(currentYear, currentMonth)) {
      // 月の最終日を超える場合は修正
      validDay = getDaysInMonth(currentYear, currentMonth);
    }
    
    // バス名も検証
    if (!busName || typeof busName !== 'string') {
      console.warn(`無効なバス名 (${busName}) をマイクロ1に修正します`);
      busName = 'マイクロ1'; // デフォルト値
    }
    
    // 現在表示中の年月情報も一緒に渡す
    const cellInfo = { 
      busName, 
      day: validDay,
      month: currentMonth,
      year: currentYear
    };
    console.log('NewScheduleFormに渡すセル情報:', cellInfo);
    
    setSelectedCell(cellInfo);
    setCurrentView("newForm");
  };
  // 予約済みセルクリック - 編集フォーム表示
  const handleScheduleCellClick = (busName, schedule) => {
    console.log(`予約済みセルがクリックされました: バス=${busName}`, schedule);
    
    // scheduleオブジェクトにidが含まれていることを確認
    if (!schedule.id) {
      console.warn('scheduleオブジェクトにIDがありません');
    }
    
    // 元のデータを保存しておく（変更検出用）
    // 日付を適切に処理
    let departureDateObj = null;
    if (schedule.content.departureDate) {
      const parts = schedule.content.departureDate.split('/');
      if (parts.length === 3) {
        departureDateObj = new Date(
          parseInt(parts[0]), 
          parseInt(parts[1]) - 1, 
          parseInt(parts[2])
        );
      }
    }
    
    // 帰着日を計算（出発日 + span - 1）
    let returnDateStr = '';
    if (departureDateObj && schedule.span > 1) {
      const returnDate = new Date(departureDateObj);
      returnDate.setDate(returnDate.getDate() + (schedule.span - 1));
      returnDateStr = `${returnDate.getFullYear()}/${String(returnDate.getMonth() + 1).padStart(2, '0')}/${String(returnDate.getDate()).padStart(2, '0')}`;
    } else if (schedule.content.departureDate) {
      returnDateStr = schedule.content.departureDate;
    }
    
    // バスタイプを解析
    let busType = '';
    if (schedule.content.memo) {
      if (schedule.content.memo.includes('小型')) busType = '小型';
      else if (schedule.content.memo.includes('中型')) busType = '中型';
      else if (schedule.content.memo.includes('大型')) busType = '大型';
      else if (schedule.content.memo.includes('マイクロ')) busType = 'マイクロ';
    }
    
    const originalData = {
      orderDate: schedule.content.orderDate || '',
      departureDate: schedule.content.departureDate || '',
      returnDate: returnDateStr,
      groupName: schedule.content.groupName || '',
      destination: schedule.content.areaInfo || '',
      passengers: schedule.content.passengers || '',
      price: schedule.content.price || '',
      contactPerson: schedule.content.travelAgency || '',
      contactInfo: schedule.content.driver || '',
      busType: busType,
      memo: schedule.content.memo || ''
    };
    
    // スケジュールデータにオリジナルデータも追加
    setSelectedSchedule({ 
      busName, 
      schedule,
      originalData 
    });
    
    setCurrentView("editForm");
  };

  // カレンダー表示に戻る
  const handleBackToCalendar = () => {
    console.log('カレンダー表示に戻ります');
    setCurrentView("calendar");
    setSelectedCell(null);
    setSelectedSchedule(null);
  };
  
  // バス名の編集を開始
  const handleBusNameDoubleClick = (busName, index) => {
    setEditingBusName(index);
    setEditBusNameValue(busName);
  };
  
  // バス名の編集を確定
  const handleBusNameChange = (e) => {
    setEditBusNameValue(e.target.value);
  };
  
  // バス名の編集を保存
  const handleBusNameSave = async (index) => {
    const oldBusName = busNames[index];
    const newBusName = editBusNameValue;
    
    console.log(`バス名を変更: ${oldBusName} → ${newBusName}`);
    
    // 新しいバス名リストを更新
    const newBusNames = [...busNames];
    newBusNames[index] = newBusName;
    setBusNames(newBusNames);
    
    try {
      // 該当のバスの予約を取得
      const busSchedules = await getSchedulesByBus(oldBusName, currentMonth, currentYear);
      console.log(`${oldBusName}のスケジュール数:`, busSchedules.length);
      
      // 各予約のバス名を更新（Firestoreも更新）
      const updatePromises = busSchedules.map(async (schedule) => {
        const updatedSchedule = { ...schedule, busName: newBusName };
        return updateScheduleWithStyles(schedule.id, updatedSchedule);
      });
      
      // すべての更新を待機
      await Promise.all(updatePromises);
      console.log(`${busSchedules.length}件のスケジュールのバス名を更新しました`);
      
      // 画面上のスケジュールデータも更新
      const updatedScheduleData = scheduleData.map(bus => {
        if (bus.busName === oldBusName) {
          return { ...bus, busName: newBusName };
        }
        return bus;
      });
      
      setScheduleData(updatedScheduleData);
      
      // 編集モードを終了
      setEditingBusName(null);
      
      // 成功メッセージ
      setUpdateModalVisible(true);
      setTimeout(() => {
        setUpdateModalVisible(false);
      }, 1500);
    } catch (err) {
      console.error("バス名更新エラー:", err);
      alert("バス名の更新に失敗しました。再度お試しください。");
      setEditingBusName(null);
    }
  };
  
  // バス名の編集を取り消し
  const handleBusNameCancel = () => {
    setEditingBusName(null);
  };
  
  // アラート情報をまとめる
  const consolidateAlerts = useCallback(() => {
    let alertMessages = [];
    
    // 連続勤務アラート
    if (alerts.length > 0) {
      alerts.forEach(alert => {
        alertMessages.push({
          type: 'warning',
          message: `${alert.busName}: ${alert.days.length}日間連続稼働中 (${alert.days.join(', ')}日)`
        });
      });
    }
    
    // 行程表未着アラート（出発日21日前かどうか）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    scheduleData.forEach(bus => {
      bus.schedule.forEach(schedule => {
        if (!schedule.content.itineraryReceived) {
          let departureDate;
          
          if (schedule.content.departureDate) {
            // 日付文字列を解析
            if (typeof schedule.content.departureDate === 'string') {
              if (schedule.content.departureDate.includes('/')) {
                const [year, month, day] = schedule.content.departureDate.split('/').map(Number);
                departureDate = new Date(year, month - 1, day);
              } else {
                departureDate = new Date(schedule.content.departureDate);
              }
            } else if (schedule.content.departureDate instanceof Date) {
              departureDate = schedule.content.departureDate;
            }
            
            if (departureDate && !isNaN(departureDate.getTime())) {
              // 出発日から21日前の日付を計算
              const deadlineDate = new Date(departureDate);
              deadlineDate.setDate(deadlineDate.getDate() - 21);
              
              // 今日が締切日以降かつ出発日前であればアラート
              if (today >= deadlineDate && today < departureDate) {
                alertMessages.push({
                  type: 'error',
                  message: `${bus.busName} (${format(departureDate, 'MM/dd')}): ${schedule.content.groupName || ''}の行程表が未着です`
                });
              }
            }
          }
        }
      });
    });
    
    return alertMessages;
  }, [alerts, scheduleData]);

  // 新規予約の保存処理 - 修正版
  const handleSaveNewSchedule = async (formData) => {
    try {
      // 現在選択されている月と年の情報を追加
      formData.month = currentMonth;
      formData.year = currentYear;
      
      console.log("保存するデータ:", formData);
      
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
      
      // 月末までの日数で予約日数を調整
      const daysLeftInMonth = getDaysInMonth(currentYear, currentMonth) - formData.day + 1;
      if (formData.span > daysLeftInMonth) {
        console.warn(`予約期間 ${formData.span}日が月末を超えるため、${daysLeftInMonth}日に調整します。`);
        formData.span = daysLeftInMonth;
      }
      
      // スタイル情報付きで保存
      await addScheduleWithStyles(formData);
      
      // 変更後に手動でデータを再取得
      let updatedData;
      if (filterBus) {
        updatedData = await getSchedulesByBus(filterBus, currentMonth, currentYear);
      } else if (filterContactPerson) {
        updatedData = await getSchedulesByContactPerson(filterContactPerson, currentMonth, currentYear);
      } else {
        updatedData = await getSchedules(currentMonth, currentYear);
      }
      
      // データを再整理して状態を更新
      const organizedData = organizeScheduleData(updatedData);
      setScheduleData(organizedData);
      
      // 担当者リストを更新
      const persons = [...new Set(updatedData.map(item => item.contactPerson).filter(Boolean))];
      setContactPersons(persons);
      
      // アラートを再チェック
      checkAlerts(organizedData);
      
      // カレンダー表示に戻る
      handleBackToCalendar();
    } catch (err) {
      console.error("予約保存エラー:", err);
      alert("予約の保存中にエラーが発生しました。");
    }
  };

  // 既存予約の更新処理 - 修正版（履歴投稿機能を削除）
const handleUpdateSchedule = async (formData, originalData = null, stayOnPage = true) => { // デフォルトでページに留まるように変更
  try {
    console.log("更新処理開始。formData:", formData);
    console.log("stayOnPage:", stayOnPage);

    if (formData.delete) {
      // 削除処理
      await deleteSchedule(formData.id);
      
      // 削除後は常にカレンダーに戻る
      handleBackToCalendar();
    } else {
      // 更新処理（スタイル情報付き）- 履歴投稿機能を削除
      const result = await updateScheduleWithStyles(formData.id, formData);
      console.log("更新結果:", result);
    
      // 変更後に手動でデータを再取得
      let updatedData;
      if (filterBus) {
        updatedData = await getSchedulesByBus(filterBus, currentMonth, currentYear);
      } else if (filterContactPerson) {
        updatedData = await getSchedulesByContactPerson(filterContactPerson, currentMonth, currentYear);
      } else {
        updatedData = await getSchedules(currentMonth, currentYear);
      }
      
      // データを再整理して状態を更新
      const organizedData = organizeScheduleData(updatedData);
      setScheduleData(organizedData);
      
      // 担当者リストを更新
      const persons = [...new Set(updatedData.map(item => item.contactPerson).filter(Boolean))];
      setContactPersons(persons);
      
      // アラートを再チェック
      checkAlerts(organizedData);
      
      // 更新成功のモーダルを表示
      console.log("更新モーダルを表示します");
      setUpdateModalVisible(true);
      
      // 一定時間後にモーダルを閉じる
      setTimeout(() => {
        console.log("モーダルを閉じます");
        setUpdateModalVisible(false);
        
        // ページ遷移はstayOnPageフラグに基づいて行う
        if (!stayOnPage) {
          handleBackToCalendar();
        }
      }, 1500);
    }
  } catch (err) {
    console.error("予約更新エラー:", err);
    alert("予約の更新中にエラーが発生しました。");
  }
};

  // CSVエクスポート
  const handleExportCSV = async () => {
    try {
      const csvData = await getSchedulesForCSVWithStyles(currentMonth, currentYear);
      const filename = `バス稼働表_${currentYear}年${currentMonth}月.csv`;
      downloadCSV(csvData, filename);
    } catch (err) {
      console.error("CSV出力エラー:", err);
      alert("CSVエクスポート中にエラーが発生しました。");
    }
  };

  // セルが特定のアラートの対象かどうかをチェック
  const checkCellAlert = (busName, day) => {
    const busAlerts = alerts.filter(alert => alert.busName === busName);
    if (busAlerts.length === 0) return null;
    
    // 日付が含まれるアラートを検索
    const matchedAlert = busAlerts.find(alert => alert.days.includes(day));
    return matchedAlert || null;
  };

  // カレンダー表示
  if (currentView === "calendar") {
    // アラート情報を取得
    const alertMessages = consolidateAlerts();
    
    return (
      <div className="container">
        <div className="header-controls">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>🚌 バス稼働表</h1>
            <Link 
              to="/drivers" 
              style={{ 
                textDecoration: 'none',
                padding: '8px 16px',
                backgroundColor: '#1890ff',
                color: 'white',
                borderRadius: '4px',
                marginLeft: '10px'
              }}
            >
              👥 ドライバー管理
            </Link>
          </div>
          
          <div className="controls">
            <div className="month-selector">
              <button onClick={handlePreviousMonth}>&lt;</button>
              <span>{currentYear}年{currentMonth}月</span>
              <button onClick={handleNextMonth}>&gt;</button>
            </div>
            
            <div className="filters">
              <select 
                value={filterBus || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterBus(value || null);
                  setFilterContactPerson(null); // 他のフィルターをリセット
                }}
              >
                <option value="">すべてのバス</option>
                {busNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              
              <select 
                value={filterContactPerson || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterContactPerson(value || null);
                  setFilterBus(null); // 他のフィルターをリセット
                }}
              >
                <option value="">すべての担当者</option>
                {contactPersons.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              
              <button className="export-button" onClick={handleExportCSV}>
                CSVエクスポート
              </button>
            </div>
          </div>
        </div>
        
        {/* お知らせ欄 */}
        {alertMessages.length > 0 && (
          <div 
            style={{ 
              margin: '10px 0 20px', 
              padding: '10px 15px', 
              backgroundColor: '#fffbe6', 
              border: '1px solid #ffe58f',
              borderRadius: '4px'
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px' }}>⚠️</span>
              <span>お知らせ（{alertMessages.length}件）</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {alertMessages.map((alert, index) => (
                <li 
                  key={index} 
                  style={{ 
                    color: alert.type === 'error' ? '#f5222d' : '#faad14', 
                    marginBottom: '5px',
                    fontSize: '14px'
                  }}
                >
                  {alert.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <div className="loading">データを読み込み中...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="table-container">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th className="bus-name-col" rowSpan="2">バス名</th>
                  {daysArray.map((day) => {
                    const weekday = getWeekday(currentYear, currentMonth, day);
                    return (
                      <th 
                        key={`weekday-${day}`} 
                        className="day-col" 
                        style={{ 
                          color: weekday.isSunday ? '#ff0000' : weekday.isSaturday ? '#0000ff' : '#333'
                        }}
                      >
                        {weekday.text}
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  {daysArray.map((day) => (
                    <th key={`day-${day}`} className="day-col">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scheduleData.map((bus, rowIndex) => (
                  <tr key={rowIndex}>
                    <td 
                      className="bus-name-col" 
                      onDoubleClick={() => handleBusNameDoubleClick(bus.busName, rowIndex)}
                    >
                      {editingBusName === rowIndex ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={editBusNameValue}
                            onChange={handleBusNameChange}
                            style={{ 
                              width: '70%', 
                              padding: '2px 5px',
                              border: '1px solid #40a9ff'
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button 
                            onClick={() => handleBusNameSave(rowIndex)}
                            style={{
                              padding: '2px 5px',
                              backgroundColor: '#52c41a',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              marginLeft: '5px'
                            }}
                          >
                            ✓
                          </button>
                          <button 
                            onClick={handleBusNameCancel}
                            style={{
                              padding: '2px 5px',
                              backgroundColor: '#f5222d',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              marginLeft: '2px'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span title="ダブルクリックで編集">{bus.busName}</span>
                      )}
                    </td>
                    {daysArray.map((day) => {
                      // この日に予約があるか確認
                      const matched = bus.schedule.find((item) => item.day === day);
                      
                      if (matched) {
                        // 予約がある場合
                        // 日数が残り日数を超える場合は調整（月末までに収める）
                        const daysLeftInMonth = getDaysInMonth(currentYear, currentMonth) - day + 1;
                        const adjustedSpan = Math.min(matched.span, daysLeftInMonth);
                        
                        // アラートチェック
                        const cellAlert = checkCellAlert(bus.busName, day);
                        const alertClass = cellAlert 
                          ? cellAlert.type === 'warning' 
                            ? 'alert-warning' 
                            : 'alert-notice'
                          : '';
                        
                        // 清算完了かどうか
                        const isPaymentCompleted = matched.content.paymentCompleted;
                        
                        return (
                          <td 
                            key={day} 
                            colSpan={adjustedSpan}
                            className={`schedule-cell day-col ${alertClass}`}
                            onClick={() => handleScheduleCellClick(bus.busName, matched)}
                            style={{
                              opacity: isPaymentCompleted ? 0.5 : 1
                            }}
                          >
                            <div className="cell-content">
                              {/* セル内容を表示（スタイル付き） */}
                              {Object.entries(cellFieldsMap).map(([styleKey, contentKey]) => {
                                const content = matched.content[contentKey] || '';
                                const style = matched.styles ? matched.styles[styleKey] : null;
                                
                                return (
                                  <div 
                                    key={contentKey} 
                                    title={content}
                                    style={style ? {
                                      backgroundColor: style.bgColor || 'inherit',
                                      color: style.textColor || 'inherit'
                                    } : {}}
                                  >
                                    {content}
                                  </div>
                                );
                              })}
                              
                              {/* アラートアイコン（オプション） */}
                              {cellAlert && (
                                <div className="alert-icon" title={cellAlert.message}>⚠️</div>
                              )}
                            </div>
                          </td>
                        );
                      } else {
                        // この日が予約済みセルの内部かどうかをチェック
                        const isPartOfPreviousBooking = bus.schedule.some(item => {
                          const startDay = item.day;
                          const endDay = startDay + Math.min(item.span, getDaysInMonth(currentYear, currentMonth) - startDay + 1) - 1;
                          return day > startDay && day <= endDay;
                        });
                        
                        if (!isPartOfPreviousBooking) {
                          return (
                            <td 
                              key={day}
                              className="empty-cell day-col"
                              onClick={() => handleEmptyCellClick(bus.busName, day)}
                            >
                              <div className="cell-content">空き</div>
                            </td>
                          );
                        }
                        
                        return null;
                      }
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="footer-info">
          <p>※セルをクリックすると予約の登録・編集ができます！</p>
          <p>※バス名をダブルクリックで編集できます</p>
          <p>最終更新: {format(new Date(), 'yyyy年MM月dd日 HH:mm', { locale: ja })}</p>
        </div>
        
        {/* モーダルはアプリ全体で共有されるようになりました */}
      </div>
    );
  }

  // 更新成功モーダル - アプリ全体で共有
  const updateSuccessModal = updateModalVisible && (
    <div 
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(76, 175, 80, 0.9)',
        color: 'white',
        padding: '20px 40px',
        borderRadius: '8px',
        zIndex: 2000, // 最前面に表示
        fontSize: '18px',
        fontWeight: 'bold',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}
    >
      <span style={{ fontSize: '24px' }}>✅</span>
      <span>更新しました</span>
    </div>
  );

  // 新規登録フォーム表示
  if (currentView === "newForm") {
    return (
      <>
        <NewScheduleForm 
          selectedCell={selectedCell} 
          onSave={handleSaveNewSchedule}
          onCancel={handleBackToCalendar}
        />
        {updateSuccessModal}
      </>
    );
  }

  // 編集フォーム表示
  if (currentView === "editForm") {
    return (
      <>
        <EditScheduleForm 
          schedule={selectedSchedule} 
          onUpdate={handleUpdateSchedule}
          onCancel={handleBackToCalendar}
        />
        {updateSuccessModal}
      </>
    );
  }
}

export default App;
