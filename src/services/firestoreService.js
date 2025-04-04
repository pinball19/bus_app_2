// src/services/firestoreService.js
import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { format } from 'date-fns';

// デフォルトのスタイル設定
export const defaultStyles = {
  departureDate: { bgColor: "#e6f7ff", textColor: "#1890ff" },
  groupName: { bgColor: "#ffffff", textColor: "#000000" },
  destination: { bgColor: "#ffffff", textColor: "#000000" },
  companyName: { bgColor: "#ffffff", textColor: "#000000" },
  price: { bgColor: "#ffffff", textColor: "#000000" },
  driverName: { bgColor: "#ffffff", textColor: "#000000" },
  memo: { bgColor: "#ffffff", textColor: "#000000" }
};

// デバッグ用のヘルパー関数
const debugLog = (message, data = null) => {
  const debugEnabled = true; // デバッグログを有効/無効にする切り替え
  
  if (debugEnabled) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
};

// 全てのスケジュールを取得する
export const getSchedules = async (month, year) => {
  try {
    const q = query(
      collection(db, 'schedules'),
      where('month', '==', month),
      where('year', '==', year)
    );
    
    const snapshot = await getDocs(q);
    const data = [];
    
    snapshot.forEach((doc) => {
      const schedule = doc.data();
      schedule.id = doc.id;
      data.push(schedule);
    });
    
    return data;
  } catch (error) {
    console.error("スケジュール取得エラー:", error);
    throw error;
  }
};

// バス名でスケジュールをフィルタリングして取得
export const getSchedulesByBus = async (busName, month, year) => {
  try {
    const q = query(
      collection(db, 'schedules'),
      where('busName', '==', busName),
      where('month', '==', month),
      where('year', '==', year)
    );
    
    const snapshot = await getDocs(q);
    const data = [];
    
    snapshot.forEach((doc) => {
      const schedule = doc.data();
      schedule.id = doc.id;
      data.push(schedule);
    });
    
    return data;
  } catch (error) {
    console.error("バス別スケジュール取得エラー:", error);
    throw error;
  }
};

// 担当者でスケジュールをフィルタリングして取得
export const getSchedulesByContactPerson = async (contactPerson, month, year) => {
  try {
    const q = query(
      collection(db, 'schedules'),
      where('contactPerson', '==', contactPerson),
      where('month', '==', month),
      where('year', '==', year)
    );
    
    const snapshot = await getDocs(q);
    const data = [];
    
    snapshot.forEach((doc) => {
      const schedule = doc.data();
      schedule.id = doc.id;
      data.push(schedule);
    });
    
    return data;
  } catch (error) {
    console.error("担当者別スケジュール取得エラー:", error);
    throw error;
  }
};

// スケジュールをリアルタイムで監視する関数
export const setupRealtimeListener = (month, year, onUpdate) => {
  console.log(`${year}年${month}月のリアルタイムリスナーをセットアップします`);
  
  const q = query(
    collection(db, 'schedules'),
    where('month', '==', month),
    where('year', '==', year)
  );
  
  // リスナーをセットアップし、unsubscribe関数を返す
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const changes = [];
    
    snapshot.docChanges().forEach((change) => {
      // 変更されたドキュメントの情報を取得
      const data = change.doc.data();
      data.id = change.doc.id;
      
      // 日付フィールドのTimestamp変換処理
      if (data.departureDate instanceof Timestamp) {
        data.departureDate = data.departureDate.toDate();
      }
      if (data.returnDate instanceof Timestamp) {
        data.returnDate = data.returnDate.toDate();
      }
      
      changes.push({
        type: change.type, // "added", "modified", "removed"
        data: data
      });
    });
    
    // 変更があった場合のみonUpdateを呼び出す
    if (changes.length > 0) {
      console.log("スケジュールデータの変更を検出:", changes);
      onUpdate(changes);
    }
  }, (error) => {
    console.error("リアルタイム更新エラー:", error);
  });
  
  console.log("リアルタイムリスナーが正常に設定されました");
  return unsubscribe;
};

// スタイル情報を含めたスケジュール追加
export const addScheduleWithStyles = async (scheduleData) => {
  console.log("スタイル情報を含めてスケジュールを追加します:", scheduleData);
  
  // styles フィールドがない場合はデフォルトのスタイルを適用
  if (!scheduleData.styles) {
    scheduleData.styles = { ...defaultStyles };
  }
  
  // 日付フィールドをTimestampに変換
  let dataToSave = { ...scheduleData };
  
  if (typeof dataToSave.departureDate === 'string' && dataToSave.departureDate) {
    dataToSave.departureDate = new Date(dataToSave.departureDate);
  }
  
  if (typeof dataToSave.returnDate === 'string' && dataToSave.returnDate) {
    dataToSave.returnDate = new Date(dataToSave.returnDate);
  }
  
  try {
    const docRef = await addDoc(collection(db, 'schedules'), dataToSave);
    console.log("スケジュールが正常に追加されました。ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("スケジュール追加エラー:", error);
    throw error;
  }
};

// スケジュールを追加
export const addSchedule = async (scheduleData) => {
  return addScheduleWithStyles(scheduleData);
};

// スタイル情報を含めたスケジュール更新
export const updateScheduleWithStyles = async (id, scheduleData) => {
  debugLog(`ID: ${id} のスケジュールを更新します:`, scheduleData);
  
  // 日付フィールドをTimestampに変換
  let dataToSave = { ...scheduleData };
  
  if (typeof dataToSave.departureDate === 'string' && dataToSave.departureDate) {
    dataToSave.departureDate = new Date(dataToSave.departureDate);
  }
  
  if (typeof dataToSave.returnDate === 'string' && dataToSave.returnDate) {
    dataToSave.returnDate = new Date(dataToSave.returnDate);
  }
  
  try {
    const docRef = doc(db, 'schedules', id);
    
    // ドキュメント更新
    await updateDoc(docRef, dataToSave);
    debugLog("スケジュールが正常に更新されました");
    return true;
  } catch (error) {
    console.error("スケジュール更新エラー:", error);
    throw error;
  }
};

// スケジュールを更新
export const updateSchedule = async (id, scheduleData) => {
  return updateScheduleWithStyles(id, scheduleData);
};

// スケジュールを削除
export const deleteSchedule = async (id) => {
  try {
    const docRef = doc(db, 'schedules', id);
    await deleteDoc(docRef);
    console.log("スケジュールが正常に削除されました");
    return true;
  } catch (error) {
    console.error("スケジュール削除エラー:", error);
    throw error;
  }
};
// アラート条件を検出する関数
export const detectAlerts = (scheduleData) => {
  console.log("==== アラート検出処理開始 ====");
  console.log("検査対象データ:", scheduleData);
  
  const alerts = [];
  
  // バスごとに処理
  scheduleData.forEach(bus => {
    const busName = bus.busName;
    console.log(`バス ${busName} のアラート検出を開始します`);
    
    // 各予約の日付を展開
    // 複数日にわたる予約の場合、すべての日を含める
    const allOccupiedDays = [];
    
    bus.schedule.forEach(item => {
      const startDay = item.day;
      const span = item.span || 1;
      console.log(`予約: 開始日=${startDay}, 日数=${span}`);
      
      // 予約の各日を配列に追加
      for (let i = 0; i < span; i++) {
        allOccupiedDays.push(startDay + i);
      }
    });
    
    // 重複を削除して昇順ソート
    const uniqueDays = [...new Set(allOccupiedDays)].sort((a, b) => a - b);
    console.log(`バス ${busName} の稼働日: ${uniqueDays.join(', ')}`);
    
    // 連続した日を検出
    if (uniqueDays.length > 0) {
      let consecutiveGroups = [];
      let currentGroup = [uniqueDays[0]];
      
      for (let i = 1; i < uniqueDays.length; i++) {
        // 連続している場合
        if (uniqueDays[i] === uniqueDays[i-1] + 1) {
          currentGroup.push(uniqueDays[i]);
          console.log(`連続日検出: ${uniqueDays[i-1]} -> ${uniqueDays[i]}`);
        } else {
          // 連続が途切れた
          if (currentGroup.length >= 1) {
            console.log(`連続グループ完了: ${currentGroup.join(', ')} (${currentGroup.length}日間)`);
            consecutiveGroups.push([...currentGroup]);
          }
          // 新しいグループを開始
          currentGroup = [uniqueDays[i]];
          console.log(`新しい連続グループ開始: ${uniqueDays[i]}`);
        }
      }
      
      // 最後のグループを追加
      if (currentGroup.length >= 1) {
        console.log(`最終連続グループ: ${currentGroup.join(', ')} (${currentGroup.length}日間)`);
        consecutiveGroups.push([...currentGroup]);
      }
      
      console.log(`検出された連続グループ: ${consecutiveGroups.length}グループ`);
      
      // 6日以上連続する稼働日をアラート対象とする
      consecutiveGroups.forEach(group => {
        if (group.length >= 6) {
          console.log(`バス ${busName} に ${group.length}日連続稼働を検出: ${group.join(', ')}`);
          alerts.push({
            busName: busName,
            type: "warning",
            message: `${group.length}日連続稼働中`,
            days: group
          });
        }
      });
    }
  });
  
  console.log(`検出されたアラート数: ${alerts.length}`);
  if (alerts.length > 0) {
    console.log("検出されたアラート:", alerts);
  }
  console.log("==== アラート検出処理終了 ====");
  
  return alerts;
};

// CSV用にデータを整形して取得
export const getSchedulesForCSVWithStyles = async (month, year) => {
  try {
    const q = query(
      collection(db, 'schedules'),
      where('month', '==', month),
      where('year', '==', year)
    );
    
    const snapshot = await getDocs(q);
    const data = [];
    
    snapshot.forEach((doc) => {
      const schedule = doc.data();
      schedule.id = doc.id;
      
      // Timestamp型の日付を文字列に変換
      if (schedule.departureDate instanceof Timestamp) {
        schedule.departureDate = format(schedule.departureDate.toDate(), 'yyyy/MM/dd');
      }
      
      if (schedule.returnDate instanceof Timestamp) {
        schedule.returnDate = format(schedule.returnDate.toDate(), 'yyyy/MM/dd');
      }
      
      data.push({
        ID: schedule.id,
        バス名: schedule.busName,
        日付: schedule.day,
        日数: schedule.span,
        受注日: schedule.orderDate || '',
        出発日: schedule.departureDate || '',
        帰着日: schedule.returnDate || '',
        団体名: schedule.groupName || '',
        行き先: schedule.destination || '',
        人数: schedule.passengers || '',
        料金: schedule.price || '',
        担当者: schedule.contactPerson || '',
        連絡先: schedule.contactInfo || '',
        車種: schedule.busType || '',
        備考: schedule.memo || '',
        // スタイル情報をJSON形式で追加（必要に応じて）
        スタイル設定: schedule.styles ? JSON.stringify(schedule.styles) : ''
      });
    });
    
    return data;
  } catch (error) {
    console.error("CSV用データ取得エラー:", error);
    throw error;
  }
};

// 既存関数のオーバーライド
// getSchedulesForCSV関数を拡張版で置き換え
export const getSchedulesForCSV = async (month, year) => {
  return getSchedulesForCSVWithStyles(month, year);
};

// === ドライバー管理機能 ===

// ドライバー一覧を取得
export const getDrivers = async (activeOnly = true) => {
  try {
    let q;
    if (activeOnly) {
      q = query(
        collection(db, 'drivers'),
        where('isActive', '==', true)
      );
    } else {
      q = query(collection(db, 'drivers'));
    }
    
    const snapshot = await getDocs(q);
    const drivers = [];
    
    snapshot.forEach((doc) => {
      drivers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 名前でソート
    return drivers.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("ドライバー取得エラー:", error);
    throw error;
  }
};

// ドライバーを名前で検索
export const getDriverByName = async (name) => {
  try {
    const q = query(
      collection(db, 'drivers'),
      where('name', '==', name)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error(`ドライバー「${name}」の取得エラー:`, error);
    throw error;
  }
};

// ドライバー追加
export const addDriver = async (driverData) => {
  try {
    // isActiveを設定
    const dataToSave = {
      ...driverData,
      isActive: true
    };
    
    const docRef = await addDoc(collection(db, 'drivers'), dataToSave);
    console.log("ドライバーが正常に追加されました。ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("ドライバー追加エラー:", error);
    throw error;
  }
};

// ドライバー更新
export const updateDriver = async (id, driverData) => {
  try {
    const docRef = doc(db, 'drivers', id);
    await updateDoc(docRef, driverData);
    console.log("ドライバーが正常に更新されました");
    return true;
  } catch (error) {
    console.error("ドライバー更新エラー:", error);
    throw error;
  }
};

// ドライバー論理削除（isActive = false）
export const deactivateDriver = async (id) => {
  try {
    const docRef = doc(db, 'drivers', id);
    await updateDoc(docRef, { isActive: false });
    console.log("ドライバーが正常に無効化されました");
    return true;
  } catch (error) {
    console.error("ドライバー無効化エラー:", error);
    throw error;
  }
};

// ドライバーの直近のスケジュールを取得
export const getDriverSchedules = async (driverName, days = 4) => {
  try {
    console.log(`「${driverName}」のスケジュールを取得中...`);
    
    // 今日の日付から指定日数分のデータを取得
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 今日の0時0分にセット
    
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);
    
    console.log(`期間: ${today.toISOString()} から ${endDate.toISOString()}`);
    
    // 今月と来月のデータを取得（月をまたぐ場合）
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    const endMonth = endDate.getMonth() + 1;
    const endYear = endDate.getFullYear();
    
    let allSchedules = [];
    
    // 今月のデータ取得
    console.log(`${currentYear}年${currentMonth}月のデータを検索`);
    const currentMonthQ = query(
      collection(db, 'schedules'),
      where('month', '==', currentMonth),
      where('year', '==', currentYear)
    );
    
    const currentSnapshot = await getDocs(currentMonthQ);
    currentSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.contactPerson === driverName) {
        allSchedules.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    // 月をまたぐ場合は翌月のデータも取得
    if (currentMonth !== endMonth || currentYear !== endYear) {
      console.log(`${endYear}年${endMonth}月のデータも検索`);
      const nextMonthQ = query(
        collection(db, 'schedules'),
        where('month', '==', endMonth),
        where('year', '==', endYear)
      );
      
      const nextSnapshot = await getDocs(nextMonthQ);
      nextSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.contactPerson === driverName) {
          allSchedules.push({
            id: doc.id,
            ...data
          });
        }
      });
    }
    
    console.log(`取得したスケジュール件数: ${allSchedules.length}件`);
    
    // 出発日でフィルタリング（4日間のみ表示）
    const filteredSchedules = allSchedules.filter(schedule => {
      // 日付文字列をパース
      let departureDate;
      
      if (!schedule.departureDate) {
        return false;
      }
      
      if (schedule.departureDate instanceof Date) {
        departureDate = schedule.departureDate;
      } else if (typeof schedule.departureDate === 'string') {
        // YYYY/MM/DD形式の場合
        if (schedule.departureDate.includes('/')) {
          const [year, month, day] = schedule.departureDate.split('/').map(Number);
          departureDate = new Date(year, month - 1, day);
        } else {
          // その他の形式
          departureDate = new Date(schedule.departureDate);
        }
      } else if (schedule.departureDate && typeof schedule.departureDate.toDate === 'function') {
        // Firestoreのタイムスタンプの場合
        departureDate = schedule.departureDate.toDate();
      }
      
      // 日付の妥当性チェック
      if (!departureDate || isNaN(departureDate.getTime())) {
        console.log(`無効な日付: ${schedule.departureDate}`);
        return false;
      }
      
      // 表示期間内かチェック
      const isInRange = departureDate >= today && departureDate <= endDate;
      
      // 現在の日付が予約期間内に含まれるか確認
      if (!isInRange && schedule.day && schedule.span > 1) {
        // 予約開始日を計算
        const startDate = new Date(schedule.year, schedule.month - 1, schedule.day);
        startDate.setHours(0, 0, 0, 0);
        
        // 予約終了日を計算
        const reservationEndDate = new Date(startDate);
        reservationEndDate.setDate(startDate.getDate() + schedule.span - 1);
        
        // 現在の日付が予約期間内に含まれるか
        if (
          (today >= startDate && today <= reservationEndDate) ||
          (startDate >= today && startDate <= endDate)
        ) {
          console.log(`期間内の予約: ${schedule.id}, ${schedule.departureDate}, 期間: ${schedule.span}日`);
          return true;
        }
      }
      
      if (isInRange) {
        console.log(`期間内の予約: ${schedule.id}, ${schedule.departureDate}`);
      }
      
      return isInRange;
    });
    
    console.log(`フィルタリング後のスケジュール件数: ${filteredSchedules.length}件`);
    
    // 日付でソート
    return filteredSchedules.sort((a, b) => {
      // 日付文字列をパース
      let dateA, dateB;
      
      if (a.departureDate instanceof Date) {
        dateA = a.departureDate;
      } else if (typeof a.departureDate === 'string') {
        if (a.departureDate.includes('/')) {
          const [yearA, monthA, dayA] = a.departureDate.split('/').map(Number);
          dateA = new Date(yearA, monthA - 1, dayA);
        } else {
          dateA = new Date(a.departureDate);
        }
      } else {
        dateA = new Date(0); // 比較用のデフォルト日付
      }
      
      if (b.departureDate instanceof Date) {
        dateB = b.departureDate;
      } else if (typeof b.departureDate === 'string') {
        if (b.departureDate.includes('/')) {
          const [yearB, monthB, dayB] = b.departureDate.split('/').map(Number);
          dateB = new Date(yearB, monthB - 1, dayB);
        } else {
          dateB = new Date(b.departureDate);
        }
      } else {
        dateB = new Date(0); // 比較用のデフォルト日付
      }
      
      return dateA.getTime() - dateB.getTime();
    });
  } catch (error) {
    console.error(`ドライバー「${driverName}」のスケジュール取得エラー:`, error);
    throw error;
  }
};

// ドライバーの直近30日間の勤務日数を集計
export const getDriverWorkDays = async (driverName) => {
  try {
    // 今日の日付から30日前までを対象
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    // 今月と先月のデータを取得（月をまたぐ場合）
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    const lastMonth = thirtyDaysAgo.getMonth() + 1;
    const lastYear = thirtyDaysAgo.getFullYear();
    
    let allSchedules = [];
    
    // 今月のデータ取得
    const currentMonthSchedules = await query(
      collection(db, 'schedules'),
      where('month', '==', currentMonth),
      where('year', '==', currentYear),
      where('contactPerson', '==', driverName)
    );
    
    const currentSnapshot = await getDocs(currentMonthSchedules);
    currentSnapshot.forEach(doc => {
      allSchedules.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 月をまたぐ場合は先月のデータも取得
    if (currentMonth !== lastMonth || currentYear !== lastYear) {
      const lastMonthSchedules = await query(
        collection(db, 'schedules'),
        where('month', '==', lastMonth),
        where('year', '==', lastYear),
        where('contactPerson', '==', driverName)
      );
      
      const lastSnapshot = await getDocs(lastMonthSchedules);
      lastSnapshot.forEach(doc => {
        allSchedules.push({
          id: doc.id,
          ...doc.data()
        });
      });
    }
    
    // 日付範囲内の予約を抽出
    const filteredSchedules = allSchedules.filter(schedule => {
      if (!schedule.departureDate) return false;
      
      const departureDate = schedule.departureDate instanceof Date
        ? schedule.departureDate
        : new Date(schedule.departureDate);
      
      return departureDate >= thirtyDaysAgo && departureDate <= today;
    });
    
    // 勤務日数を計算（期間を考慮）
    let workDays = 0;
    filteredSchedules.forEach(schedule => {
      workDays += schedule.span || 1;
    });
    
    return {
      totalWorkDays: workDays,
      scheduleCount: filteredSchedules.length
    };
  } catch (error) {
    console.error(`ドライバー「${driverName}」の勤務日数集計エラー:`, error);
    throw error;
  }
};

// ドライバーの連続勤務日数をチェック
export const checkDriverConsecutiveWorkDays = async (driverName) => {
  try {
    // 現在の日付を基準に前後の予約を取得
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 15); // 過去15日間
    
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 15);  // 未来15日間
    
    let allSchedules = [];
    
    // 月をまたぐ可能性があるため、複数月のデータを取得
    for (let monthOffset = -1; monthOffset <= 1; monthOffset++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() + monthOffset);
      
      const targetMonth = targetDate.getMonth() + 1;
      const targetYear = targetDate.getFullYear();
      
      const monthSchedules = await query(
        collection(db, 'schedules'),
        where('month', '==', targetMonth),
        where('year', '==', targetYear),
        where('contactPerson', '==', driverName)
      );
      
      const snapshot = await getDocs(monthSchedules);
      snapshot.forEach(doc => {
        allSchedules.push({
          id: doc.id,
          ...doc.data()
        });
      });
    }
    
    // 全ての日付をリストアップ
    const workDays = new Set();
    
    allSchedules.forEach(schedule => {
      if (!schedule.departureDate) return;
      
      let departureDate;
      if (schedule.departureDate instanceof Date) {
        departureDate = new Date(schedule.departureDate);
      } else if (typeof schedule.departureDate === 'string') {
        // YYYY/MM/DD形式の場合
        if (schedule.departureDate.includes('/')) {
          const [year, month, day] = schedule.departureDate.split('/').map(Number);
          departureDate = new Date(year, month - 1, day);
        } else {
          departureDate = new Date(schedule.departureDate);
        }
      } else if (schedule.departureDate && typeof schedule.departureDate.toDate === 'function') {
        // Firestoreのタイムスタンプの場合
        departureDate = schedule.departureDate.toDate();
      }
      
      if (!departureDate || isNaN(departureDate.getTime())) return;
      
      // 予約期間の各日を追加
      const span = schedule.span || 1;
      for (let i = 0; i < span; i++) {
        const date = new Date(departureDate);
        date.setDate(departureDate.getDate() + i);
        
        // YYYY-MM-DD形式で保存
        const dateStr = date.toISOString().split('T')[0];
        workDays.add(dateStr);
      }
    });
    
    // 日付を昇順でソート
    const sortedDays = Array.from(workDays).sort();
    
    // 連続勤務日数を検出
    let maxConsecutiveDays = 0;
    let currentConsecutiveDays = 0;
    let consecutiveGroups = [];
    
    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        currentConsecutiveDays = 1;
        consecutiveGroups.push([sortedDays[i]]);
        continue;
      }
      
      const prevDate = new Date(sortedDays[i-1]);
      const currDate = new Date(sortedDays[i]);
      
      // 前日の翌日が今日の場合、連続している
      prevDate.setDate(prevDate.getDate() + 1);
      
      if (
        prevDate.getFullYear() === currDate.getFullYear() &&
        prevDate.getMonth() === currDate.getMonth() &&
        prevDate.getDate() === currDate.getDate()
      ) {
        // 連続している
        currentConsecutiveDays++;
        consecutiveGroups[consecutiveGroups.length - 1].push(sortedDays[i]);
      } else {
        // 連続が途切れた
        if (currentConsecutiveDays > maxConsecutiveDays) {
          maxConsecutiveDays = currentConsecutiveDays;
        }
        
        currentConsecutiveDays = 1;
        consecutiveGroups.push([sortedDays[i]]);
      }
    }
    
    // 最後のグループもチェック
    if (currentConsecutiveDays > maxConsecutiveDays) {
      maxConsecutiveDays = currentConsecutiveDays;
    }
    
    // 6日以上の連続勤務があるグループを抽出
    const longWorkPeriods = consecutiveGroups.filter(group => group.length >= 6);
    
    return {
      maxConsecutiveDays,
      hasLongWorkPeriod: longWorkPeriods.length > 0,
      longWorkPeriods
    };
  } catch (error) {
    console.error(`ドライバー「${driverName}」の連続勤務チェックエラー:`, error);
    throw error;
  }
};

// === チャット機能 ===

// スケジュールに関連するメッセージの取得
export const getMessagesForSchedule = async (scheduleId) => {
  if (!scheduleId) {
    console.error('スケジュールIDが指定されていません');
    return [];
  }
  
  try {
    const messagesRef = collection(db, 'schedules', scheduleId, 'messages');
    // タイムスタンプでソート（昇順: 古い→新しい）
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    
    const messages = [];
    snapshot.forEach(doc => {
      const messageData = doc.data();
      messages.push({
        id: doc.id,
        ...messageData,
        timestamp: messageData.timestamp?.toDate() || new Date()
      });
    });
    
    // Firestore側でソート済み
    return messages;
  } catch (error) {
    console.error('メッセージ取得エラー:', error);
    return [];
  }
};

// メッセージ送信
export const addMessageToSchedule = async (scheduleId, messageData) => {
  if (!scheduleId) {
    console.error('スケジュールIDが指定されていません');
    throw new Error('スケジュールIDが必要です');
  }
  
  try {
    const messagesRef = collection(db, 'schedules', scheduleId, 'messages');
    const messageToSave = {
      ...messageData,
      timestamp: Timestamp.now()
    };
    
    const docRef = await addDoc(messagesRef, messageToSave);
    debugLog('メッセージが正常に追加されました:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('メッセージ追加エラー:', error);
    throw error;
  }
};

// 履歴投稿機能は削除しました
