import React from 'react';
import './TranslateConfigView.css';

// Define language options for dropdowns
const languageOptions = [
  { value: 'ja', label: '日文 (Japanese)' },
  { value: 'zh-CN', label: '简体中文 (Simplified Chinese)' },
  { value: 'zh-TW', label: '繁体中文 (Traditional Chinese)' },
  { value: 'en', label: '英文 (English)' },
  // Add other languages as needed based on actual values used
];


export default function TranslateConfigView({ translateConfig, setTranslateConfig }) {
  const handleChange = (key, value) => {
    // Convert to number if the input type suggests it
    let numericValue = value;
    if (['maxTextLength', 'concurrentTaskThreshold', 'tasksPerMinuteThreshold', 'timeoutThreshold', 'taskRetryThreshold', 'autosaveInterval'].includes(key)) {
      numericValue = Number(value);
      if (isNaN(numericValue)) {
        // Handle invalid number input, e.g., by not updating or showing an error
        console.warn(`Invalid number for ${key}: ${value}`);
        return; 
      }
    }

    setTranslateConfig(prevConfig => ({
      ...prevConfig,
      [key]: numericValue,
    }));
  };

  const configItems = [
    {
      key: 'maxTextLength',
      title: '最大文本长度',
      description: '一次提交LLM的最大原文长度。',
      type: 'number',
      value: translateConfig.maxTextLength,
    },
    {
      key: 'originalLanguage',
      title: '原文语言',
      description: '原文语言选项',
      type: 'select',
      options: languageOptions,
      value: translateConfig.originalLanguage,
    },
    {
      key: 'translatedLanguage',
      title: '译文语言',
      description: '译文语言选项',
      type: 'select',
      options: languageOptions,
      value: translateConfig.translatedLanguage,
    },
    {
      key: 'concurrentTaskThreshold',
      title: '并发任务阈值',
      description: '同时执行翻译任务的最大值',
      type: 'number',
      value: translateConfig.concurrentTaskThreshold,
    },
    {
      key: 'tasksPerMinuteThreshold',
      title: '每分钟任务数量阈值',
      description: '每分钟发起的最大任务数量，如果设置为0，则视为不限制',
      type: 'number',
      value: translateConfig.tasksPerMinuteThreshold,
    },
    {
      key: 'timeoutThreshold',
      title: '超时阈值 (秒)',
      description: '请求等待的最长时间（秒），如果超时未收到回复，则视为失败。',
      type: 'number', // Float input, step="any" or step="0.1" can be added
      value: translateConfig.timeoutThreshold,
      step: "0.1" 
    },
    {
      key: 'taskRetryThreshold',
      title: '任务重试阈值',
      description: '当一个任务失败，则发起重试。直到任务完成，或者超过重试阈值。',
      type: 'number',
      value: translateConfig.taskRetryThreshold,
    },
    {
      key: 'autosaveInterval',
      title: '自动保存时间 (秒)',
      description: '自动保存工程的时间间隔(秒)',
      type: 'number', // Float input
      value: translateConfig.autosaveInterval,
      step: "0.1"
    },
  ];

  return (
    <div className="translate-config-view">
      <h2>翻译配置项 (Translation Configuration)</h2>
      <div className="config-items-grid">
        {configItems.map(item => (
          <div key={item.key} className="config-item-card">
            <div className="config-item-header">
              <h3 className="config-item-title">{item.title}</h3>
            </div>
            <p className="config-item-description">{item.description}</p>
            <div className="config-item-input">
              {item.type === 'select' ? (
                <select
                  value={item.value}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                >
                  {item.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={item.type}
                  value={item.value}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                  step={item.step || (item.type === 'number' && !Number.isInteger(item.value) ? "any" : undefined)}
                  min={item.type === 'number' ? "0" : undefined} // Basic validation
                />
              )}
            </div>
          </div>
        ))}
      </div>
       {/* A general save button might be useful if changes aren't immediate, but current setup updates App state onChange */}
       {/* <button onClick={() => console.log('Current translateConfig state:', translateConfig)} className="debug-button">Log Config State</button> */}
    </div>
  );
}
