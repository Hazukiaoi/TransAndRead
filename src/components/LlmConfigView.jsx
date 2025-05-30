import React, { useState } from 'react';
import './LlmConfigView.css';
import { callLlmApi } from '../utils/llmUtils'; // Import the API call function

export default function LlmConfigView({
  llmApiAddress,
  setLlmApiAddress,
  llmModel,
  setLlmModel,
  llmApiKey,
  setLlmApiKey,
  llmCustomParams,
  setLlmCustomParams,
  availableModels = [],
  translateConfig, // Get timeout from translateConfig
  // Props for test status feedback (to be added from App.jsx later if needed for global state)
  // llmTestStatus, 
  // setLlmTestStatus,
  // llmTestMessage,
  // setLlmTestMessage 
}) {
  const [testButtonStatus, setTestButtonStatus] = useState('idle'); // idle, testing, success, failure
  const [testButtonMessage, setTestButtonMessage] = useState('');

  const handleGetModelsFromServer = () => {
    console.log('Attempting to fetch models...');
    alert('Simulated model fetch. Implement actual API call later.');
  };

  const handleTestServer = async () => {
    setTestButtonStatus('testing');
    setTestButtonMessage('Testing server connection...');

    if (!llmApiAddress || !llmApiAddress.trim()) {
        setTestButtonStatus('failure');
        setTestButtonMessage('API Address is required.');
        setTimeout(() => { setTestButtonStatus('idle'); setTestButtonMessage(''); }, 3000);
        return;
    }
    if (!llmModel || !llmModel.trim()) {
        setTestButtonStatus('failure');
        setTestButtonMessage('Model is required.');
        setTimeout(() => { setTestButtonStatus('idle'); setTestButtonMessage(''); }, 3000);
        return;
    }
    // API Key might be optional for some local LLMs
    // if (!llmApiKey || !llmApiKey.trim()) {
    //     setTestButtonStatus('failure');
    //     setTestButtonMessage('API Key is required.');
    //     setTimeout(() => { setTestButtonStatus('idle'); setTestButtonMessage(''); }, 3000);
    //     return;
    // }


    // Ensure the API address ends with /v1/chat/completions or similar if it's a base URL
    // For now, assume user enters the full path. Or, append if not present.
    let fullApiUrl = llmApiAddress;
    if (!fullApiUrl.endsWith('/v1/chat/completions') && !fullApiUrl.includes('/chat/completions')) {
        // A common convention is that the user provides the base URL
        // and we append the standard path.
        // However, the design doc says "POST to http://api地址/v1/chat/completions"
        // which implies the user *might* provide the full path.
        // For robustness, if they provide base, append. If they provide full, use it.
        // This simple check might not cover all cases.
        if (!fullApiUrl.endsWith('/')) fullApiUrl += '/';
        if (!fullApiUrl.endsWith('v1/')) fullApiUrl += 'v1/';
        fullApiUrl += 'chat/completions';
        console.log("Adjusted API URL for test:", fullApiUrl);
    }


    const messages = [{ role: 'user', content: '自我介绍' }]; // Test message from design doc
    
    const paramsForApi = llmCustomParams.reduce((acc, param) => {
      if (param.key) acc[param.key] = param.value;
      return acc;
    }, {});

    const result = await callLlmApi({
      apiAddress: fullApiUrl,
      apiKey: llmApiKey,
      model: llmModel,
      messages,
      customParams: paramsForApi,
      timeoutSeconds: translateConfig.timeoutThreshold || 120,
    });

    if (result.success) {
      setTestButtonStatus('success');
      // const responseContent = result.data?.choices?.[0]?.message?.content || "No content in response";
      // setTestButtonMessage(`Success! Response: ${responseContent.substring(0,100)}...`);
      setTestButtonMessage(`Success! Received response from model.`);
      console.log("Test API call successful:", result.data);
    } else {
      setTestButtonStatus('failure');
      setTestButtonMessage(`Error: ${result.message}`);
      console.error("Test API call failed:", result);
    }
    setTimeout(() => { setTestButtonStatus('idle'); setTestButtonMessage(''); }, 5000); // Reset after 5s
  };

  const handleAddModelParameter = () => {
    setLlmCustomParams([...llmCustomParams, { key: '', value: '' }]);
  };

  const handleRemoveModelParameter = (index) => {
    const newParams = llmCustomParams.filter((_, i) => i !== index);
    setLlmCustomParams(newParams);
  };

  const handleModelParameterChange = (index, field, value) => {
    const newParams = llmCustomParams.map((param, i) => 
      i === index ? { ...param, [field]: value } : param
    );
    setLlmCustomParams(newParams);
  };

  let testButtonText = '测试服务器';
  if (testButtonStatus === 'testing') testButtonText = 'Testing...';
  else if (testButtonStatus === 'success') testButtonText = 'Test Successful!';
  else if (testButtonStatus === 'failure') testButtonText = 'Test Failed!';

  return (
    <div className="llm-config-view">
      <h2>LLM Configuration</h2>

      <div className="config-section">
        <label htmlFor="llmApiAddress">API Address (full path to /v1/chat/completions or similar):</label>
        <input
          type="text"
          id="llmApiAddress"
          value={llmApiAddress}
          onChange={(e) => setLlmApiAddress(e.target.value)}
          placeholder="e.g., http://localhost:1234/v1/chat/completions"
        />
      </div>

      <div className="config-section">
        <label htmlFor="llmModel">Model Selection:</label>
        <div className="model-selection-group">
          <input
            type="text"
            id="llmModelInput"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            placeholder="Enter model name or select"
            list="availableModelsList"
          />
          <datalist id="availableModelsList">
            {availableModels.map((model, index) => (
              <option key={index} value={model.id || model.name || model} />
            ))}
          </datalist>
          <select 
            id="llmModelSelect" 
            value={llmModel} 
            onChange={(e) => setLlmModel(e.target.value)}
            className="model-dropdown"
          >
            <option value="">-- Select a model --</option>
            {availableModels.map((model, index) => (
              <option key={index} value={model.id || model.name || model}>
                {model.name || model.id || model}
              </option>
            ))}
            {llmModel && !availableModels.some(m => (m.id || m.name || m) === llmModel) && (
                 <option key="custom" value={llmModel}>{llmModel} (custom)</option>
            )}
          </select>
          <button onClick={handleGetModelsFromServer} className="inline-button">
            从服务器获取
          </button>
        </div>
      </div>

      <div className="config-section">
        <label htmlFor="llmApiKey">API Key:</label>
        <input
          type="password"
          id="llmApiKey"
          value={llmApiKey}
          onChange={(e) => setLlmApiKey(e.target.value)}
          placeholder="Enter your API Key (if required)"
        />
      </div>

      <div className="config-section">
        <h3>Custom Parameters:</h3>
        {llmCustomParams.map((param, index) => (
          <div key={index} className="custom-param-row">
            <input
              type="text"
              value={param.key}
              onChange={(e) => handleModelParameterChange(index, 'key', e.target.value)}
              placeholder="Parameter Key (e.g., temperature)"
              className="param-key-input"
            />
            <input
              type="text"
              value={param.value}
              onChange={(e) => handleModelParameterChange(index, 'value', e.target.value)}
              placeholder="Parameter Value (e.g., 0.7)"
              className="param-value-input"
            />
            <button onClick={() => handleRemoveModelParameter(index)} className="delete-button">
              Delete
            </button>
          </div>
        ))}
        <button onClick={handleAddModelParameter} className="add-param-button">
          Add Parameter
        </button>
      </div>

      <div className="config-section">
        <button 
          onClick={handleTestServer} 
          className={`test-server-button ${testButtonStatus}`}
          disabled={testButtonStatus === 'testing'}
        >
          {testButtonText}
        </button>
        {testButtonMessage && <p className={`test-message ${testButtonStatus}`}>{testButtonMessage}</p>}
      </div>
    </div>
  );
}
