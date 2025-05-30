import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import JSZip from 'jszip';
import Titlebar from './Titlebar';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';
import LlmConfigView from './components/LlmConfigView';
import PromptConfigView from './components/PromptConfigView';
import TranslateConfigView from './components/TranslateConfigView'; 
import GlossaryView from './components/GlossaryView';
import ConsoleView from './components/ConsoleView';
import { LoggingContext } from './contexts/LoggingContext';
import { segmentArticleForTranslation } from './utils/translationUtils'; 
import { callLlmApi } from './utils/llmUtils'; 

import './App.css';
import './Titlebar.css';
import './Sidebar.css';
import './ContentArea.css';

// --- Default Data ---
const defaultPromptsConfigDataFull = {
  translation: { typeName: "翻译 (Translation)", systemPrompt: "You are a helpful translation assistant. Translate the text from {{src_lang}} to {{dst_lang}}. Respond only with translated segments, each starting with '-> '. Maintain segment count.", userPrompt: "Please translate the following text segments:\n{{text}}" },
  glossaryExtraction: { typeName: "词表提取 (Glossary Extraction)", systemPrompt: "You are a helpful linguistic assistant. Extract key terminology from the provided text ({{src_lang}}). For each term, provide a translation in {{dst_lang}} and a category (e.g., technical, general, proper noun). Output ONLY a valid JSON array of arrays, where each inner array is [\"original_term\", \"translated_term\", \"category\"]. Example: [[\"猫\",\"cat\",\"animal\"],[\"ソフトウェア\",\"software\",\"technology\"]]", userPrompt: "Extract glossary from:\n{{text}}" },
  originalTextSplit: { typeName: "原文拆分 (Original Text Split)", systemPrompt: "You are an expert text segmentation assistant. The user has split an original text segment ({{src_lang}}) into two parts. You are given the original full text and the full translated text ({{dst_lang}}). Your task is to split the translated text at a point that semantically corresponds to the user's split in the original text. Respond ONLY with the two parts of the translated text, each prefixed with '-> ' and separated by a newline. Example:\n-> First part of translation.\n-> Second part of translation.", userPrompt: "Original full text ({{src_lang}}):\n{{src_before_split}}\n\nTranslated full text ({{dst_lang}}):\n{{trans_before_split}}\n\nThe original text was split into these two parts:\nPart 1: {{src_split_00}}\nPart 2: {{src_split_01}}\n\nBased on this, provide the corresponding split for the translated text:" },
  translatedTextSplit: { typeName: "译文拆分 (Translated Text Split)", systemPrompt: "You are an expert text segmentation assistant. The user has split a translated text segment ({{dst_lang}}) into two parts. You are given the full translated text and the full original text ({{src_lang}}). Your task is to split the original text at a point that semantically corresponds to the user's split in the translated text. Respond ONLY with the two parts of the original text, each prefixed with '-> ' and separated by a newline. Example:\n-> First part of original.\n-> Second part of original.", userPrompt: "Translated full text ({{dst_lang}}):\n{{trans_before_split}}\n\nOriginal full text ({{src_lang}}):\n{{src_before_split}}\n\nThe translated text was split into these two parts:\nPart 1: {{trans_split_00}}\nPart 2: {{trans_split_01}}\n\nBased on this, provide the corresponding split for the original text:" }
};
const defaultLlmConfigJsonStructureFull = { api_provider_name: "OpenAI", model: "gpt-3.5-turbo", api_key: "", parameter: { temperature: "0", stream: "true", max_tokens: "2000" }};
const defaultTranslateConfigDataFull = { maxTextLength: 500, originalLanguage: "ja", translatedLanguage: "zh-CN", concurrentTaskThreshold: 1, tasksPerMinuteThreshold: 0, timeoutThreshold: 120, taskRetryThreshold: 16, autosaveInterval: 60,};

function App() {
  // --- State Variables ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('translation'); 
  const [article, _setArticle] = useState(null); 
  const [wordTable, _setWordTable] = useState([]);
  const [currentProjectName, _setCurrentProjectName] = useState("");
  const [llmApiAddress, _setLlmApiAddress] = useState(''); 
  const [llmModel, _setLlmModel] = useState(defaultLlmConfigJsonStructureFull.model);
  const [llmApiKey, _setLlmApiKey] = useState(defaultLlmConfigJsonStructureFull.api_key); 
  const [llmCustomParams, _setLlmCustomParams] = useState(Object.entries(defaultLlmConfigJsonStructureFull.parameter).map(([k,v])=>({key:k,value:String(v)})));
  const [availableModels, setAvailableModels] = useState([]);
  const [llmApiProviderName, _setLlmApiProviderName] = useState(defaultLlmConfigJsonStructureFull.api_provider_name);
  const [promptsConfig, _setPromptsConfig] = useState(defaultPromptsConfigDataFull);
  const [translateConfig, _setTranslateConfig] = useState(defaultTranslateConfigDataFull);
  const [logs, setLogs] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [currentTranslationJobId, setCurrentTranslationJobId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autosaveIntervalRef = useRef(null);

  // --- Wrapped Setters to track unsaved changes ---
  /** @param {React.SetStateAction<Array<object>|null>} valueOrUpdater */
  const setArticle = (valueOrUpdater) => { _setArticle(valueOrUpdater); setHasUnsavedChanges(true); };
  const setWordTable = (valueOrUpdater) => { _setWordTable(valueOrUpdater); setHasUnsavedChanges(true); };
  const setCurrentProjectName = (valueOrUpdater) => { _setCurrentProjectName(valueOrUpdater); setHasUnsavedChanges(true);};
  const setLlmApiAddress = (valueOrUpdater) => { _setLlmApiAddress(valueOrUpdater); setHasUnsavedChanges(true); };
  const setLlmModel = (valueOrUpdater) => { _setLlmModel(valueOrUpdater); setHasUnsavedChanges(true); };
  const setLlmApiKey = (valueOrUpdater) => { _setLlmApiKey(valueOrUpdater); setHasUnsavedChanges(true); };
  const setLlmCustomParams = (valueOrUpdater) => { _setLlmCustomParams(valueOrUpdater); setHasUnsavedChanges(true); };
  const setLlmApiProviderName = (valueOrUpdater) => { _setLlmApiProviderName(valueOrUpdater); setHasUnsavedChanges(true); };
  const setPromptsConfig = (valueOrUpdater) => { _setPromptsConfig(valueOrUpdater); setHasUnsavedChanges(true); };
  const _setTranslateConfigInternal = _setTranslateConfig;
  const setTranslateConfig = (valueOrUpdater) => { _setTranslateConfigInternal(valueOrUpdater); setHasUnsavedChanges(true); };

  /**
   * Adds a log message to the in-app console and browser console.
   * @param {string} message - The message to log.
   * @param {'info'|'warn'|'error'|'success'|'detail'|'action'|'system'} [level='info'] - The log level.
   */
  const addLog = useCallback((message, level = 'info') => {
    const timestamp = new Date().toISOString();
    setLogs(pL => { const nL = [...pL, {timestamp,message,level}]; return nL.length>200?nL.slice(nL.length-200):nL; });
    if(level==='error')console.error(`[AppLog] ${timestamp} [${level.toUpperCase()}] ${message}`);
    else if(level==='warn')console.warn(`[AppLog] ${timestamp} [${level.toUpperCase()}] ${message}`);
    else console.log(`[AppLog] ${timestamp} [${level.toUpperCase()}] ${message}`);
  }, []);
  /** Clears all logs from the in-app console. */
  const clearLogs = useCallback(() => { setLogs([]); addLog("Console cleared.", "system"); }, [addLog]);

  // --- Segment Editing & Context Menu Action Handlers ---
  /** Handles changes to the original text of a segment. */
  const handleSegmentOriginalChange = (index, newText) => setArticle(p => p?.map((s, i) => i === index ? { ...s, src: newText } : s) || null);
  /** Handles changes to the translated text of a segment. */
  const handleSegmentTranslatedChange = (index, newText) => setArticle(p => p?.map((s, i) => i === index ? { ...s, trans: newText } : s) || null);
  /** Placeholder for manual translation of a single segment. */
  const handleTranslateSegmentPlaceholder = (index) => addLog(`Placeholder: Manual translate segment ${index}`, 'info');
  /** Merges the segment at `index` with the segment above it. */
  const handleMergeUp = (index) => { if (!article || index <= 0) return; addLog(`Merging segment ${index} up with ${index-1}`, 'action'); setArticle(p => { const mergedSrc = p[index-1].src + (p[index-1].src && p[index].src ? "\n" : "") + p[index].src; const mergedTrans = p[index-1].trans + (p[index-1].trans && p[index].trans ? "\n" : "") + p[index].trans; return [...p.slice(0, index-1), { ...p[index-1], src: mergedSrc, trans: mergedTrans }, ...p.slice(index + 1)]; }); };
  /** Merges the segment at `index` with the segment below it. */
  const handleMergeDown = (index) => { if (!article || index >= article.length - 1) return; addLog(`Merging segment ${index} down with ${index+1}`, 'action'); setArticle(p => { const mergedSrc = p[index].src + (p[index].src && p[index+1].src ? "\n" : "") + p[index+1].src; const mergedTrans = p[index].trans + (p[index].trans && p[index+1].trans ? "\n" : "") + p[index+1].trans; return [...p.slice(0, index), { ...p[index], src: mergedSrc, trans: mergedTrans }, ...p.slice(index + 2)]; }); };
  /** Inserts an empty segment below the segment at `index`. */
  const handleInsertEmptySegmentBelow = (index) => { if(article===null && index === -1){setArticle([{src:"",trans:"",id:`seg-${Date.now()}`}]); return;} if(!article)return; addLog(`Inserted empty segment below ${index}`, 'action'); setArticle(p => [...p.slice(0, index + 1), { src: "", trans: "", id: `seg-${Date.now()}` }, ...p.slice(index + 1)]);};
  /** Marks the segment at `index` as a chapter start. */
  const handleMarkAsChapterStart = (index) => { if(!article)return; addLog(`Marked segment ${index} as chapter start`, 'action'); setArticle(p => p.map((s, i) => i === index ? { ...s, chapters: (s.trans || s.src || "New Chapter").substring(0, 20) } : s ));};
  /** Unmarks the segment at `index` as a chapter start. */
  const handleUnmarkChapterStart = (index) => { if(!article)return; addLog(`Unmarked chapter start for segment ${index}`, 'action'); setArticle(p => p.map((s, i) => { if (i === index) { const { chapters, ...rest } = s; return rest; } return s; }));};
  /** Deletes the segment at `index`. */
  const handleDeleteSegment = (index) => { if (!article || article.length <= 1) { alert("Cannot delete last segment."); return; } addLog(`Deleted segment ${index}`, 'action'); setArticle(p => p.filter((_, i) => i !== index));};

  /**
   * Collects source text from the article, calls LLM to extract glossary terms,
   * and updates the wordTable state with new, unique terms.
   */
  const handleBuildGlossary = async () => { /* ... (Full implementation from previous step) ... */ };
  
  /** Naively splits both src and trans fields of a segment based on cursor position in one of them. */
  const originalHandleSplitSegment = useCallback((index, cursorPosInTa) => { /* ... (Full implementation from previous step) ... */ }, [article, addLog]);
  /**
   * Splits a segment using LLM assistance for the non-primary text part.
   * Falls back to originalHandleSplitSegment if LLM is not needed or fails.
   */
  const handleSplitSegmentWithLLM = async (index, cursorPosInTa) => { /* ... (Full implementation from previous step) ... */ };

  /** Handles starting the batch translation process for the current article. */
  const handleStartTranslation = async () => { /* ... (Full implementation from previous step, using addLog) ... */ };
  /** Handles stopping an ongoing translation process. */
  const handleStopTranslation = () => { /* ... (Full implementation from previous step, using addLog) ... */ };

  // --- TRS File Structure Builders ---
  const buildLlmConfigForSave = () => ({ api_provider_name: llmApiProviderName, model: llmModel, api_key: llmApiKey, parameter: llmCustomParams.reduce((acc, param) => { if (param.key) acc[param.key] = param.value; return acc; }, {})});
  const buildPromptsForSave = () => Object.entries(promptsConfig).map(([key, val]) => ({ type: key, system: val.systemPrompt, user: val.userPrompt }));

  /** Packages the current project state into a JSZip blob for downloading. */
  const packageCurrentProjectToTrs = useCallback(() => {
    addLog("Packaging project into TRS file...", "info");
    const zip = new JSZip();
    const safeArticle = article || [];
    const articleToSave = safeArticle.map(({ id, ...rest }) => rest); 
    zip.file("article.json", JSON.stringify(articleToSave, null, 2));
    zip.file("prompt.json", JSON.stringify(buildPromptsForSave(), null, 2));
    zip.file("llm_config.json", JSON.stringify(buildLlmConfigForSave(), null, 2));
    zip.file("translate_config.json", JSON.stringify(translateConfig, null, 2));
    zip.file("word_table.json", JSON.stringify(wordTable, null, 2));
    zip.file("metadata.json", JSON.stringify({ projectName: currentProjectName, savedAt: new Date().toISOString() }, null, 2));
    return zip.generateAsync({ type: "blob" });
  }, [article, promptsConfig, llmApiProviderName, llmModel, llmApiKey, llmCustomParams, translateConfig, wordTable, currentProjectName, addLog]);

  /** Handles the project save action, triggering a download of the TRS file. */
  const handleSaveProject = useCallback(async () => {
    if (!article && !currentProjectName && wordTable.length === 0) { 
        addLog("Save cancelled: No project data.", "warn");
        alert("Nothing to save. Load a file or add some data.");
        return;
    }
    addLog("Saving project...", "info");
    try {
      const blob = await packageCurrentProjectToTrs();
      const sanitizedName = (currentProjectName || "project").replace(/[^a-z0-9_.-]/gi, '_');
      const filename = `${sanitizedName}.trs`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(link.href); 
      addLog(`Project saved as ${filename}`, 'success');
      setHasUnsavedChanges(false);
    } catch (error) { addLog(`Error saving project: ${error.message}`, 'error'); console.error("Error saving project:", error); }
  }, [packageCurrentProjectToTrs, currentProjectName, addLog, article, wordTable]);

  // --- File Handling ---
  /** Handles file drop, prompting to save unsaved changes before loading. */
  const handleFileDrop = useCallback(async (event) => {
    event.preventDefault(); event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (hasUnsavedChanges) {
        if (window.confirm("You have unsaved changes. Save now?")) {
          await handleSaveProject(); 
        }
      }
      addLog(`File dropped: ${file.name}`, 'info');
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      _setCurrentProjectName(baseName); // Use direct setter, unsaved status handled by process/load
      setCurrentView('translation');
      if (file.name.endsWith('.txt')) { await processTxtFile(file, baseName); }
      else if (file.name.endsWith('.trs')) { await loadTrsFile(file); }
      else { addLog(`Unsupported file: ${file.name}`, 'warn'); alert('Unsupported file type.'); }
      event.dataTransfer.clearData();
    }
  }, [hasUnsavedChanges, handleSaveProject, addLog]); // Removed processTxtFile, loadTrsFile from here, they don't change

  /** Processes a dropped TXT file, setting up a new project state. */
  const processTxtFile = async (file, baseName) => { 
    const textContent = await file.text();
    const segments = textContent.split(/\r?\n/).map((line, idx) => ({ src: line, trans: '', id: `seg-txt-${idx}` }));
    _setArticle(segments); 
    _setLlmApiAddress(''); _setLlmApiProviderName(defaultLlmConfigJsonStructureFull.api_provider_name);
    _setLlmModel(defaultLlmConfigJsonStructureFull.model); _setLlmApiKey(defaultLlmConfigJsonStructureFull.api_key);
    _setLlmCustomParams(Object.entries(defaultLlmConfigJsonStructureFull.parameter).map(([k, v]) => ({ key: k, value: String(v) })));
    _setPromptsConfig(defaultPromptsConfigDataFull); 
    _setTranslateConfig(defaultTranslateConfigDataFull); 
    _setWordTable([]); 
    // _setCurrentProjectName(baseName); // Already set in handleFileDrop
    addLog(`Processed TXT: ${file.name}. Segments: ${segments.length}`, 'success');
    setHasUnsavedChanges(true); 
  };
  
  /** Loads a TRS project file, updating all relevant application states. */
  const loadTrsFile = async (file) => { 
    addLog(`Loading TRS file: ${file.name}...`, 'info');
    try {
      const zip = await JSZip.loadAsync(file);
      const newArticle = zip.files['article.json'] ? JSON.parse(await zip.files['article.json'].async('string')).map((s,i)=>({...s, id:`seg-load-${i}`})) : [];
      _setArticle(newArticle); addLog('article.json loaded.', 'detail');
      
      const newPrompts = { ...defaultPromptsConfigDataFull };
      if(zip.files['prompt.json']) JSON.parse(await zip.files['prompt.json'].async('string')).forEach(p=>{if(newPrompts[p.type]){newPrompts[p.type].systemPrompt=p.system;newPrompts[p.type].userPrompt=p.user;}});
      _setPromptsConfig(newPrompts); addLog('prompt.json processed.', 'detail');
      
      if(zip.files['llm_config.json']) { const c=await zip.files['llm_config.json'].async('string'); const pLCfg=JSON.parse(c); _setLlmApiProviderName(pLCfg.api_provider_name||defaultLlmConfigJsonStructureFull.api_provider_name); _setLlmModel(pLCfg.model||defaultLlmConfigJsonStructureFull.model); _setLlmApiKey(pLCfg.api_key||defaultLlmConfigJsonStructureFull.api_key); _setLlmCustomParams(pLCfg.parameter?Object.entries(pLCfg.parameter).map(([k,v])=>({key:k,value:String(v)})):Object.entries(defaultLlmConfigJsonStructureFull.parameter).map(([k,v])=>({key:k,value:String(v)}))); addLog('llm_config.json loaded.','detail');} 
      else { _setLlmApiProviderName(defaultLlmConfigJsonStructureFull.api_provider_name);_setLlmModel(defaultLlmConfigJsonStructureFull.model);_setLlmApiKey(defaultLlmConfigJsonStructureFull.api_key);_setLlmCustomParams(Object.entries(defaultLlmConfigJsonStructureFull.parameter).map(([k,v])=>({key:k,value:String(v)})));addLog('llm_config.json not found, using defaults.','warn');} 
      
      _setTranslateConfig(zip.files['translate_config.json'] ? {...defaultTranslateConfigDataFull, ...JSON.parse(await zip.files['translate_config.json'].async('string'))} : defaultTranslateConfigDataFull);
      addLog('translate_config.json processed.', 'detail');
      _setWordTable(zip.files['word_table.json'] ? JSON.parse(await zip.files['word_table.json'].async('string')) : []);
      addLog('word_table.json processed.', 'detail');

      if (zip.files['metadata.json']) { const metadata = JSON.parse(await zip.files['metadata.json'].async('string')); _setCurrentProjectName(metadata.projectName || file.name.replace('.trs','')); addLog('metadata.json loaded.', 'detail'); } 
      else { _setCurrentProjectName(file.name.replace('.trs','')); }
      addLog(`TRS loaded: ${file.name}`, 'success');
      setHasUnsavedChanges(false); 
    } catch (e) { addLog(`Error loading TRS ${file.name}: ${e.message}`, 'error'); alert(`Error: ${e.message}`); _setArticle(null); _setCurrentProjectName(""); _setPromptsConfig(defaultPromptsConfigDataFull); /* reset all other states */ _setWordTable([]); setHasUnsavedChanges(false); }
  };
  
  // Global Event Listeners (Drag-drop, Ctrl+S, BeforeUnload, Autosave)
  useEffect(() => {
    const dnd=(e)=>{e.preventDefault();e.stopPropagation();}; 
    window.addEventListener('dragover',dnd);window.addEventListener('dragleave',dnd);
    window.addEventListener('drop',handleFileDrop);
    
    const handleKeyDown = (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); addLog("Ctrl+S pressed, saving project...", "action"); handleSaveProject(); }};
    window.addEventListener('keydown', handleKeyDown);
    
    const handleBeforeUnload = (event) => { if (hasUnsavedChanges) { event.preventDefault(); event.returnValue = ''; }};
    window.addEventListener('beforeunload', handleBeforeUnload);

    if (autosaveIntervalRef.current) clearInterval(autosaveIntervalRef.current);
    if (translateConfig.autosaveInterval > 0) {
      autosaveIntervalRef.current = setInterval(() => {
        if (hasUnsavedChanges) { addLog(`Autosaving project... Interval: ${translateConfig.autosaveInterval}s`, 'info'); handleSaveProject(); }
      }, translateConfig.autosaveInterval * 1000);
    }
    return ()=>{ window.removeEventListener('dragover',dnd);window.removeEventListener('dragleave',dnd);window.removeEventListener('drop',handleFileDrop); window.removeEventListener('keydown',handleKeyDown); window.removeEventListener('beforeunload',handleBeforeUnload); if(autosaveIntervalRef.current)clearInterval(autosaveIntervalRef.current);};
  }, [handleFileDrop, hasUnsavedChanges, handleSaveProject, addLog, translateConfig.autosaveInterval]);


  // --- Main Content Rendering ---
  let mainContent;
  if (currentView === 'translation') {
    mainContent = ( <ContentArea {...{ article, onSegmentOriginalChange: handleSegmentOriginalChange, onSegmentTranslatedChange: handleSegmentTranslatedChange, onSplitSegment: handleSplitSegmentWithLLM, onTranslateThisSegment: handleTranslateSegmentPlaceholder, onMergeUp, onMergeDown, onInsertEmptySegmentBelow, onMarkAsChapterStart, onUnmarkChapterStart, onDeleteSegment }} /> );
  } else if (currentView === 'llmConfig') {
    mainContent = (<LlmConfigView {...{ llmApiAddress, setLlmApiAddress, llmModel, setLlmModel, llmApiKey, setLlmApiKey, llmCustomParams, setLlmCustomParams, availableModels, translateConfig, addLog }} />);
  } else if (currentView === 'promptConfig') { 
    mainContent = (<PromptConfigView {...{ promptsConfig, setPromptsConfig }} />);
  } else if (currentView === 'translateConfig') { 
    mainContent = (<TranslateConfigView {...{ translateConfig, setTranslateConfig }} />);
  } else if (currentView === 'glossary') { 
    mainContent = (<GlossaryView {...{ wordTable, setWordTable, addLog, onBuildGlossary: handleBuildGlossary, articleLoaded: !!article && article.length > 0 }} />);
  } else if (currentView === 'console') { 
    mainContent = (<ConsoleView />); 
  }
  
  return (
    <LoggingContext.Provider value={{ logs, addLog, clearLogs }}>
      <div className="app">
        <Titlebar currentProjectName={currentProjectName} hasUnsavedChanges={hasUnsavedChanges} onTitleClick={handleSaveProject} />
        <div className="main-layout">
          <PanelGroup direction="horizontal">
            <Panel defaultSize={20} collapsible={true} collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} minSize={10} className="sidebar-panel">
              <Sidebar {...{ collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed, setCurrentView, isTranslating, translationProgress, articleLoaded: !!article && article.length > 0, onStartTranslation: handleStartTranslation, onStopTranslation: handleStopTranslation }} />
            </Panel>
            <PanelResizeHandle className="resize-handle" />
            <Panel className="content-panel">{mainContent}</Panel>
          </PanelGroup>
        </div>
      </div>
    </LoggingContext.Provider>
  );
}
export default App;
