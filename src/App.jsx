import React, { useState, useCallback, useEffect } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import JSZip from 'jszip';
import Titlebar from './Titlebar';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';
import LlmConfigView from './components/LlmConfigView';
import PromptConfigView from './components/PromptConfigView';
import TranslateConfigView from './components/TranslateConfigView'; 
import GlossaryView from './components/GlossaryView'; // Import GlossaryView

import './App.css';
import './Titlebar.css';
import './Sidebar.css';
import './ContentArea.css';

// --- Default Data ---
const defaultPromptsConfigData = {
  translation: { typeName: "翻译 (Translation)", systemPrompt: "Translate the given text accurately.", userPrompt: "Translate this: {{text}}" },
  glossaryExtraction: { typeName: "词表提取 (Glossary Extraction)", systemPrompt: "Extract key terms and their definitions.", userPrompt: "Extract terms from: {{text}}" },
  originalTextSplit: { typeName: "原文拆分 (Original Text Split)", systemPrompt: "Split the original text into meaningful segments.", userPrompt: "Split: {{text}}" },
  translatedTextSplit: { typeName: "译文拆分 (Translated Text Split)", systemPrompt: "Split the translated text into meaningful segments.", userPrompt: "Split: {{text}}" }
};
const defaultLlmConfigJsonStructure = {
  api_provider_name: "OpenAI", model: "gpt-3.5-turbo", api_key: "", 
  parameter: { temperature: "0", stream: "true", max_tokens: "2000" }
};
const defaultTranslateConfigData = {
  maxTextLength: 500, originalLanguage: "ja", translatedLanguage: "zh-CN", 
  concurrentTaskThreshold: 1, tasksPerMinuteThreshold: 0, timeoutThreshold: 120, 
  taskRetryThreshold: 16, autosaveInterval: 60,
};

function App() {
  // --- State Variables ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('translation'); 
  const [article, setArticle] = useState(null); 
  const [wordTable, setWordTable] = useState([]); // Existing state for glossary
  const [currentProjectName, setCurrentProjectName] = useState("");

  const [llmApiAddress, setLlmApiAddress] = useState(''); 
  const [llmModel, setLlmModel] = useState(defaultLlmConfigJsonStructure.model);
  const [llmApiKey, setLlmApiKey] = useState(defaultLlmConfigJsonStructure.api_key); 
  const [llmCustomParams, setLlmCustomParams] = useState(
    Object.entries(defaultLlmConfigJsonStructure.parameter).map(([key, value]) => ({ key, value: String(value) }))
  );
  const [availableModels, setAvailableModels] = useState([]);
  const [llmApiProviderName, setLlmApiProviderName] = useState(defaultLlmConfigJsonStructure.api_provider_name);

  const [promptsConfig, setPromptsConfig] = useState(defaultPromptsConfigData);
  const [translateConfig, setTranslateConfig] = useState(defaultTranslateConfigData);

  // --- Segment Editing Handlers ---
  const handleSegmentOriginalChange = (index, newText) => {
    setArticle(prevArticle => {
      if (!prevArticle) return null;
      const updatedArticle = [...prevArticle];
      updatedArticle[index] = { ...updatedArticle[index], src: newText };
      return updatedArticle;
    });
  };
  const handleSegmentTranslatedChange = (index, newText) => {
    setArticle(prevArticle => {
      if (!prevArticle) return null;
      const updatedArticle = [...prevArticle];
      updatedArticle[index] = { ...updatedArticle[index], trans: newText };
      return updatedArticle;
    });
  };

  // --- Context Menu Action Handlers ---
  const handleSplitSegment = (index, cursorPosInTa) => {
    if (!cursorPosInTa || article === null || index < 0 || index >= article.length) return;
    const segmentToSplit = article[index];
    let part1Src = "", part2Src = "", part1Trans = "", part2Trans = "";

    if (cursorPosInTa.area === 'original') {
        part1Src = segmentToSplit.src.substring(0, cursorPosInTa.position);
        part2Src = segmentToSplit.src.substring(cursorPosInTa.position);
        const transRatio = segmentToSplit.src.length > 0 ? cursorPosInTa.position / segmentToSplit.src.length : 0.5;
        const transSplitPoint = Math.floor(transRatio * segmentToSplit.trans.length);
        part1Trans = segmentToSplit.trans.substring(0, transSplitPoint);
        part2Trans = segmentToSplit.trans.substring(transSplitPoint);
    } else { 
        part1Trans = segmentToSplit.trans.substring(0, cursorPosInTa.position);
        part2Trans = segmentToSplit.trans.substring(cursorPosInTa.position);
        const srcRatio = segmentToSplit.trans.length > 0 ? cursorPosInTa.position / segmentToSplit.trans.length : 0.5;
        const srcSplitPoint = Math.floor(srcRatio * segmentToSplit.src.length);
        part1Src = segmentToSplit.src.substring(0, srcSplitPoint);
        part2Src = segmentToSplit.src.substring(srcSplitPoint);
    }
    setArticle(prev => [
        ...prev.slice(0, index),
        { ...segmentToSplit, src: part1Src, trans: part1Trans }, 
        { src: part2Src, trans: part2Trans, id: `seg-${Date.now()}` }, 
        ...prev.slice(index + 1)
    ]);
  };
  const handleTranslateSegment = (index) => console.log(`Placeholder: Translate segment ${index}`);
  const handleMergeUp = (index) => {
    if (article === null || index <= 0) return;
    setArticle(prev => {
        const mergedSrc = prev[index-1].src + (prev[index-1].src && prev[index].src ? "\n" : "") + prev[index].src;
        const mergedTrans = prev[index-1].trans + (prev[index-1].trans && prev[index].trans ? "\n" : "") + prev[index].trans;
        return [...prev.slice(0, index-1), { ...prev[index-1], src: mergedSrc, trans: mergedTrans }, ...prev.slice(index + 1)];
    });
  };
  const handleMergeDown = (index) => {
    if (article === null || index >= article.length - 1) return;
     setArticle(prev => {
        const mergedSrc = prev[index].src + (prev[index].src && prev[index+1].src ? "\n" : "") + prev[index+1].src;
        const mergedTrans = prev[index].trans + (prev[index].trans && prev[index+1].trans ? "\n" : "") + prev[index+1].trans;
        return [...prev.slice(0, index), { ...prev[index], src: mergedSrc, trans: mergedTrans }, ...prev.slice(index + 2)];
    });
  };
  const handleInsertEmptySegmentBelow = (index) => {
    if (article === null && index === -1) { // Special case for empty article
        setArticle([{ src: "", trans: "", id: `seg-${Date.now()}` }]);
        return;
    }
    if (article === null) return;
    setArticle(prev => [
        ...prev.slice(0, index + 1),
        { src: "", trans: "", id: `seg-${Date.now()}` }, 
        ...prev.slice(index + 1)
    ]);
  };
  const handleMarkAsChapterStart = (index) => {
     if (article === null) return;
     setArticle(prev => prev.map((seg, i) => 
        i === index ? { ...seg, chapters: (seg.trans || seg.src || "New Chapter").substring(0, 20) } : seg
     ));
  };
  const handleUnmarkChapterStart = (index) => {
    if (article === null) return;
    setArticle(prev => prev.map((seg, i) => {
        if (i === index) { const { chapters, ...rest } = seg; return rest; }
        return seg;
    }));
  };
  const handleDeleteSegment = (index) => {
    if (article === null || article.length <= 1) {
        alert("Cannot delete the only segment or if no article is loaded.");
        return;
    }
    setArticle(prev => prev.filter((_, i) => i !== index));
  };

  // --- TRS File Structure Builders ---
  const buildLlmConfigForSave = () => ({
      api_provider_name: llmApiProviderName, model: llmModel, api_key: llmApiKey,
      parameter: llmCustomParams.reduce((acc, param) => { if (param.key) acc[param.key] = param.value; return acc; }, {})
  });
  const buildPromptsForSave = () => Object.entries(promptsConfig).map(([key, val]) => ({
      type: key, system: val.systemPrompt, user: val.userPrompt
  }));

  // --- File Handling ---
  const handleFileDrop = useCallback(async (event) => {
    event.preventDefault(); event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setCurrentProjectName(baseName); setCurrentView('translation');
      if (file.name.endsWith('.txt')) await processTxtFile(file, baseName);
      else if (file.name.endsWith('.trs')) await loadTrsFile(file);
      else alert('Unsupported file type.');
      event.dataTransfer.clearData();
    }
  }, [llmApiProviderName, llmModel, llmApiKey, llmCustomParams, promptsConfig, translateConfig, article, wordTable]);

  const processTxtFile = async (file, baseName) => {
    const textContent = await file.text();
    const segments = textContent.split(/\r?\n/).map((line, idx) => ({ src: line, trans: '', id: `seg-txt-${idx}` }));
    setArticle(segments);
    setLlmApiAddress(''); setLlmApiProviderName(defaultLlmConfigJsonStructure.api_provider_name);
    setLlmModel(defaultLlmConfigJsonStructure.model); setLlmApiKey(defaultLlmConfigJsonStructure.api_key);
    setLlmCustomParams(Object.entries(defaultLlmConfigJsonStructure.parameter).map(([k, v]) => ({ key: k, value: String(v) })));
    setPromptsConfig(defaultPromptsConfigData);
    setTranslateConfig(defaultTranslateConfigData); 
    setWordTable([]); 
    await createAndLogTrsInMemory(baseName, segments, buildPromptsForSave(), buildLlmConfigForSave(), translateConfig, wordTable);
  };

  const createAndLogTrsInMemory = async (baseName, articleData, promptsJson, llmConfigJson, currentTranslateConfig, currentWordTable) => {
    const zip = new JSZip();
    const articleToSave = articleData.map(({ id, ...rest }) => rest); // Strip client-side IDs
    zip.file("article.json", JSON.stringify(articleToSave, null, 2));
    zip.file("prompt.json", JSON.stringify(promptsJson, null, 2));
    zip.file("llm_config.json", JSON.stringify(llmConfigJson, null, 2));
    zip.file("translate_config.json", JSON.stringify(currentTranslateConfig, null, 2));
    zip.file("word_table.json", JSON.stringify(currentWordTable, null, 2));
    try {
      const blob = await zip.generateAsync({ type: "blob" });
      console.log(`TRS project "${baseName}.trs" created in memory. Size: ${blob.size} bytes.`);
    } catch (e) { console.error("Error creating TRS zip file:", e); }
  };
  
  const loadTrsFile = async (file) => {
    try {
      const zip = await JSZip.loadAsync(file);
      if (zip.files['article.json']) {
        const content = await zip.files['article.json'].async('string');
        setArticle(JSON.parse(content).map((seg, idx) => ({...seg, id: `seg-load-${idx}`})));
      } else setArticle([]);
      
      if (zip.files['prompt.json']) { 
        const content = await zip.files['prompt.json'].async('string');
        const newCfg = { ...defaultPromptsConfigData };
        JSON.parse(content).forEach(p => { if (newCfg[p.type]) { newCfg[p.type].systemPrompt = p.system; newCfg[p.type].userPrompt = p.user; }});
        setPromptsConfig(newCfg);
      } else setPromptsConfig(defaultPromptsConfigData);

      if (zip.files['llm_config.json']) { 
        const content = await zip.files['llm_config.json'].async('string');
        const pLlmCfg = JSON.parse(content);
        setLlmApiProviderName(pLlmCfg.api_provider_name || defaultLlmConfigJsonStructure.api_provider_name);
        setLlmModel(pLlmCfg.model || defaultLlmConfigJsonStructure.model);
        setLlmApiKey(pLlmCfg.api_key || defaultLlmConfigJsonStructure.api_key);
        setLlmCustomParams(pLlmCfg.parameter ? Object.entries(pLlmCfg.parameter).map(([k,v])=>({key:k,value:String(v)})) : Object.entries(defaultLlmConfigJsonStructure.parameter).map(([k,v])=>({key:k,value:String(v)})));
      } else { 
        setLlmApiProviderName(defaultLlmConfigJsonStructure.api_provider_name); 
        setLlmModel(defaultLlmConfigJsonStructure.model); 
        setLlmApiKey(defaultLlmConfigJsonStructure.api_key); 
        setLlmCustomParams(Object.entries(defaultLlmConfigJsonStructure.parameter).map(([k,v])=>({key:k,value:String(v)})));
      } 

      if (zip.files['translate_config.json']) { 
        const content = await zip.files['translate_config.json'].async('string');
        setTranslateConfig(prev => ({ ...defaultTranslateConfigData, ...JSON.parse(content) }));
      } else setTranslateConfig(defaultTranslateConfigData);

      if (zip.files['word_table.json']) { 
        const content = await zip.files['word_table.json'].async('string');
        setWordTable(JSON.parse(content)); 
      } else setWordTable([]); 
      console.log(`TRS loaded: ${file.name}`);
    } catch (e) { 
      console.error("Error loading TRS:", e); alert(`Error: ${e.message}`);
      setArticle(null); setCurrentProjectName(""); setPromptsConfig(defaultPromptsConfigData);
      setLlmApiProviderName(defaultLlmConfigJsonStructure.api_provider_name); setLlmModel(defaultLlmConfigJsonStructure.model);
      setLlmApiKey(defaultLlmConfigJsonStructure.api_key); setLlmCustomParams(Object.entries(defaultLlmConfigJsonStructure.parameter).map(([k,v])=>({key:k,value:String(v)})));
      setTranslateConfig(defaultTranslateConfigData); setWordTable([]);
    }
  };
  
  useEffect(() => {
    const dnd = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('dragover', dnd); window.addEventListener('dragleave', dnd);
    window.addEventListener('drop', handleFileDrop);
    return () => { window.removeEventListener('dragover', dnd); window.removeEventListener('dragleave', dnd); window.removeEventListener('drop', handleFileDrop); };
  }, [handleFileDrop]);

  // --- Main Content Rendering ---
  let mainContent;
  if (currentView === 'translation') {
    mainContent = (
      <ContentArea 
        article={article} 
        onSegmentOriginalChange={handleSegmentOriginalChange}
        onSegmentTranslatedChange={handleSegmentTranslatedChange}
        onSplitSegment={handleSplitSegment}
        onTranslateThisSegment={handleTranslateSegment}
        onMergeUp={handleMergeUp}
        onMergeDown={handleMergeDown}
        onInsertEmptySegmentBelow={handleInsertEmptySegmentBelow}
        onMarkAsChapterStart={handleMarkAsChapterStart}
        onUnmarkChapterStart={handleUnmarkChapterStart}
        onDeleteSegment={handleDeleteSegment}
      />);
  } else if (currentView === 'llmConfig') {
    mainContent = (<LlmConfigView {...{ llmApiAddress, setLlmApiAddress, llmModel, setLlmModel, llmApiKey, setLlmApiKey, llmCustomParams, setLlmCustomParams, availableModels, translateConfig }} />);
  } else if (currentView === 'promptConfig') { 
    mainContent = (<PromptConfigView {...{ promptsConfig, setPromptsConfig }} />);
  } else if (currentView === 'translateConfig') { 
    mainContent = (<TranslateConfigView {...{ translateConfig, setTranslateConfig }} />);
  } else if (currentView === 'glossary') { // Added GlossaryView
    mainContent = (<GlossaryView {...{ wordTable, setWordTable }} />);
  }

  return (
    <div className="app">
      <Titlebar currentProjectName={currentProjectName} />
      <div className="main-layout">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={20} collapsible={true} collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} minSize={10} className="sidebar-panel">
            <Sidebar {...{ collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed, setCurrentView }} />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel className="content-panel">{mainContent}</Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
export default App;
