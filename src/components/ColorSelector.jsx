// src/components/ColorSelector.jsx
import { useState } from 'react';

// フィールド名の日本語表示
const fieldLabels = {
  departureDate: '出発日',
  groupName: '団体名',
  destination: '行き先',
  travelAgency: '担当者',
  price: '料金',
  driver: '連絡先',
  passengers: '人数',
  memo: '備考'
};

// 一般的なカラーパレット
const colorPresets = [
  { bg: "#ffffff", text: "#000000", label: "デフォルト" },
  { bg: "#90caf9", text: "#0d47a1", label: "青" },
  { bg: "#81c784", text: "#1b5e20", label: "緑" },
  { bg: "#ffb74d", text: "#e65100", label: "オレンジ" },
  { bg: "#ef9a9a", text: "#b71c1c", label: "赤" },
  { bg: "#ce93d8", text: "#4a148c", label: "紫" },
  { bg: "#bdbdbd", text: "#424242", label: "グレー" },
  { bg: "#ffd54f", text: "#ff6f00", label: "黄色" },
  { bg: "#ffe6e6", text: "#ff3b30", label: "薄赤" },
  { bg: "#80cbc4", text: "#004d40", label: "ターコイズ" }
];

/**
 * 色選択コンポーネント
 * @param {Object} props
 * @param {string} props.fieldName - フィールド名
 * @param {Object} props.currentStyle - 現在の色スタイル { bgColor, textColor }
 * @param {Function} props.onChange - 色が変更されたときのコールバック (fieldName, bgColor, textColor) => void
 */
const ColorSelector = ({ fieldName, currentStyle, onChange }) => {
  // 選択されたプリセット
  const [selectedPreset, setSelectedPreset] = useState(
    currentStyle 
      ? colorPresets.findIndex(preset => 
          preset.bg === currentStyle.bgColor && preset.text === currentStyle.textColor
        ) 
      : 0
  );

  // プリセット選択時の処理
  const handlePresetClick = (preset, index) => {
    setSelectedPreset(index);
    onChange(fieldName, preset.bg, preset.text);
  };

  // フィールド名の日本語表示を取得
  const displayName = fieldLabels[fieldName] || fieldName;

  return (
    <div className="color-selector">
      <h4>{displayName}の色設定</h4>
      <div className="color-presets">
        {colorPresets.map((preset, index) => (
          <div
            key={index}
            className={`color-preset ${index === selectedPreset ? 'selected' : ''}`}
            style={{
              backgroundColor: preset.bg,
              color: preset.text,
            }}
            onClick={() => handlePresetClick(preset, index)}
          >
            {preset.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorSelector;