import React, { useState, useEffect } from 'react';
import './PromptConfigView.css';

export default function PromptConfigView({ promptsConfig, setPromptsConfig }) {
  // The prompt types are derived from the keys of promptsConfig or a predefined list
  const promptTypes = Object.keys(promptsConfig);
  const [selectedPromptType, setSelectedPromptType] = useState(promptTypes[0] || '');

  const [currentSystemPrompt, setCurrentSystemPrompt] = useState('');
  const [currentUserPrompt, setCurrentUserPrompt] = useState('');

  useEffect(() => {
    if (selectedPromptType && promptsConfig[selectedPromptType]) {
      setCurrentSystemPrompt(promptsConfig[selectedPromptType].systemPrompt);
      setCurrentUserPrompt(promptsConfig[selectedPromptType].userPrompt);
    } else {
      setCurrentSystemPrompt('');
      setCurrentUserPrompt('');
    }
  }, [selectedPromptType, promptsConfig]);

  const handleSystemPromptChange = (e) => {
    setCurrentSystemPrompt(e.target.value);
  };

  const handleUserPromptChange = (e) => {
    setCurrentUserPrompt(e.target.value);
  };

  const handleSavePrompts = () => {
    if (!selectedPromptType) {
      alert("Please select a prompt type.");
      return;
    }
    setPromptsConfig(prevConfig => ({
      ...prevConfig,
      [selectedPromptType]: {
        ...prevConfig[selectedPromptType], // Keep other potential properties like typeName
        systemPrompt: currentSystemPrompt,
        userPrompt: currentUserPrompt,
      }
    }));
    alert(`Prompts for "${promptsConfig[selectedPromptType]?.typeName || selectedPromptType}" saved!`);
  };
  
  const handleTypeSelection = (typeKey) => {
    // Before switching, consider if changes should be auto-saved or if a save button is enough
    // For now, changes are local until "Save Prompts" is clicked.
    setSelectedPromptType(typeKey);
  };


  return (
    <div className="prompt-config-view">
      <div className="prompt-sidebar">
        <h3>Prompt Types</h3>
        <ul>
          {promptTypes.map((typeKey) => (
            <li
              key={typeKey}
              className={selectedPromptType === typeKey ? 'active' : ''}
              onClick={() => handleTypeSelection(typeKey)}
            >
              {promptsConfig[typeKey]?.typeName || typeKey}
            </li>
          ))}
        </ul>
      </div>
      <div className="prompt-main-area">
        <h2>Configure Prompts for: {promptsConfig[selectedPromptType]?.typeName || selectedPromptType}</h2>
        <div className="prompt-edit-section">
          <div className="prompt-area">
            <label htmlFor="systemPrompt">System Prompt:</label>
            <textarea
              id="systemPrompt"
              value={currentSystemPrompt}
              onChange={handleSystemPromptChange}
              rows={10}
            />
          </div>
          <div className="prompt-area">
            <label htmlFor="userPrompt">User Prompt:</label>
            <textarea
              id="userPrompt"
              value={currentUserPrompt}
              onChange={handleUserPromptChange}
              rows={10}
            />
          </div>
        </div>
        <button onClick={handleSavePrompts} className="save-prompts-button">
          Save Current Prompts
        </button>
      </div>
    </div>
  );
}
