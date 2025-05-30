import React, { useState, useCallback, useEffect } from 'react';
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
const defaultPromptsConfigData = {
  translation: { typeName: "翻译 (Translation)", systemPrompt: "Translate the given text accurately. Respond only with the translated segments, each starting with '-> '. Maintain the same number of segments as the input.", userPrompt: "Translate the following text segments from {{src_lang}} to {{dst_lang}}:\n{{text}}" },
  glossaryExtraction: { typeName: "词表提取 (Glossary Extraction)", systemPrompt: "Extract a glossary from the provided text. The output should be a JSON array of arrays, where each inner array is [\"original_term\", \"translated_term\", \"category\"]. Example: [[\"猫\",\"cat\",\"animal\"],[\"犬\",\"dog\",\"animal\"]]", userPrompt: "Extract glossary from text ({{src_lang}} to {{dst_lang}}):\n{{text}}" },
  originalTextSplit: { typeName: "原文拆分 (Original Text Split)", systemPrompt: "You are an expert in text segmentation. The user will provide a segment of original text ({{src_lang}}) that they have split at a certain point, and the corresponding full translated text ({{dst_lang}}). Your task is to split the translated text at a point that semantically corresponds to the split in the original text. Respond with the two parts of the translated text, each prefixed with '-> '. Example: -> part1\n-> part2", userPrompt: "Original full text ({{src_lang}}):\n{{src_before_split}}\n\nTranslated full text ({{dst_lang}}):\n{{trans_before_split}}\n\nThe original text was split into two parts:\nPart 1: {{src_split_00}}\nPart 2: {{src_split_01}}\n\nNow, provide the corresponding split for the translated text:" },
  translatedTextSplit: { typeName: "译文拆分 (Translated Text Split)", systemPrompt: "You are an expert in text segmentation. The user will provide a segment of translated text ({{dst_lang}}) that they have split at a certain point, and the corresponding full original text ({{src_lang}}). Your task is to split the original text at a point that semantically corresponds to the split in the translated text. Respond with the two parts of the original text, each prefixed with '-> '. Example: -> part1\n-> part2", userPrompt: "Translated full text ({{dst_lang}}):\n{{trans_before_split}}\n\nOriginal full text ({{src_lang}}):\n{{src_before_split}}\n\nThe translated text was split into two parts:\nPart 1: {{trans_split_00}}\nPart 2: {{trans_split_01}}\n\nNow, provide the corresponding split for the original text:" }
};
const defaultLlmConfigJsonStructure = { api_provider_name: "OpenAI", model: "gpt-3.5-turbo", api_key: "", parameter: { temperature: "0", stream: "true", max_tokens: "2000" }};
const defaultTranslateConfigData = { maxTextLength: 500, originalLanguage: "ja", translatedLanguage: "zh-CN", concurrentTaskThreshold: 1, tasksPerMinuteThreshold: 0, timeoutThreshold: 120, taskRetryThreshold: 16, autosaveInterval: 60,};

function App() {
  // States
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('translation'); 
  const [article, setArticle] = useState(null); 
  const [wordTable, setWordTable] = useState([]);
  const [currentProjectName, setCurrentProjectName] = useState("");
  const [llmApiAddress, setLlmApiAddress] = useState(''); 
  const [llmModel, setLlmModel] = useState(defaultLlmConfigJsonStructure.model);
  const [llmApiKey, setLlmApiKey] = useState(defaultLlmConfigJsonStructure.api_key); 
  const [llmCustomParams, setLlmCustomParams] = useState(Object.entries(defaultLlmConfigJsonStructure.parameter).map(([k,v])=>({key:k,value:String(v)})));
  const [availableModels, setAvailableModels] = useState([]);
  const [llmApiProviderName, setLlmApiProviderName] = useState(defaultLlmConfigJsonStructure.api_provider_name);
  const [promptsConfig, setPromptsConfig] = useState(defaultPromptsConfigData);
  const [translateConfig, setTranslateConfig] = useState(defaultTranslateConfigData);
  const [logs, setLogs] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [currentTranslationJobId, setCurrentTranslationJobId] = useState(null);

  // Logging
  const addLog = useCallback((message, level = 'info') => {
    const timestamp = new Date().toISOString();
    setLogs(pL => { const nL = [...pL, {timestamp,message,level}]; return nL.length>200?nL.slice(nL.length-200):nL; });
    if(level==='error')console.error(`[AppLog] ${timestamp} [${level.toUpperCase()}] ${message}`);
    else if(level==='warn')console.warn(`[AppLog] ${timestamp} [${level.toUpperCase()}] ${message}`);
    else console.log(`[AppLog] ${timestamp} [${level.toUpperCase()}] ${message}`);
  }, []);
  const clearLogs = useCallback(() => { setLogs([]); addLog("Console cleared.", "system"); }, [addLog]);

  // Segment Editing & Basic Context Menu Actions
  const handleSegmentOriginalChange = (index, newText) => setArticle(p => p?.map((s, i) => i === index ? { ...s, src: newText } : s));
  const handleSegmentTranslatedChange = (index, newText) => setArticle(p => p?.map((s, i) => i === index ? { ...s, trans: newText } : s));
  const handleTranslateSegmentPlaceholder = (index) => addLog(`Placeholder: Manual translate segment ${index}`, 'info');
  const handleMergeUp = (index) => { if (!article || index <= 0) return; addLog(`Merging segment ${index} up with ${index-1}`, 'action'); setArticle(p => { const mergedSrc = p[index-1].src + (p[index-1].src && p[index].src ? "\n" : "") + p[index].src; const mergedTrans = p[index-1].trans + (p[index-1].trans && p[index].trans ? "\n" : "") + p[index].trans; return [...p.slice(0, index-1), { ...p[index-1], src: mergedSrc, trans: mergedTrans }, ...p.slice(index + 1)]; }); };
  const handleMergeDown = (index) => { if (!article || index >= article.length - 1) return; addLog(`Merging segment ${index} down with ${index+1}`, 'action'); setArticle(p => { const mergedSrc = p[index].src + (p[index].src && p[index+1].src ? "\n" : "") + p[index+1].src; const mergedTrans = p[index].trans + (p[index].trans && p[index+1].trans ? "\n" : "") + p[index+1].trans; return [...p.slice(0, index), { ...p[index], src: mergedSrc, trans: mergedTrans }, ...p.slice(index + 2)]; }); };
  const handleInsertEmptySegmentBelow = (index) => { if(article===null && index === -1){setArticle([{src:"",trans:"",id:`seg-${Date.now()}`}]); return;} if(!article)return; addLog(`Inserted empty segment below ${index}`, 'action'); setArticle(p => [...p.slice(0, index + 1), { src: "", trans: "", id: `seg-${Date.now()}` }, ...p.slice(index + 1)]);};
  const handleMarkAsChapterStart = (index) => { if(!article)return; addLog(`Marked segment ${index} as chapter start`, 'action'); setArticle(p => p.map((s, i) => i === index ? { ...s, chapters: (s.trans || s.src || "New Chapter").substring(0, 20) } : s ));};
  const handleUnmarkChapterStart = (index) => { if(!article)return; addLog(`Unmarked chapter start for segment ${index}`, 'action'); setArticle(p => p.map((s, i) => { if (i === index) { const { chapters, ...rest } = s; return rest; } return s; }));};
  const handleDeleteSegment = (index) => { if (!article || article.length <= 1) { alert("Cannot delete last segment."); return; } addLog(`Deleted segment ${index}`, 'action'); setArticle(p => p.filter((_, i) => i !== index));};

  // LLM-Assisted Glossary Extraction
  const handleBuildGlossary = async () => {
    if (!article || article.length === 0) { addLog("Cannot build glossary: No article.", "warn"); alert("Load article first."); return; }
    addLog("Starting LLM glossary extraction...", "info");
    const fullSrcText = article.map(seg => seg.src).join("\n").substring(0, 15000); // Limit context for safety

    let systemP = promptsConfig.glossaryExtraction.systemPrompt.replace("{{src_lang}}",translateConfig.originalLanguage).replace("{{dst_lang}}",translateConfig.translatedLanguage);
    const userP = promptsConfig.glossaryExtraction.userPrompt.replace("{{text}}", fullSrcText);
    const messages = [{ role: 'system', content: systemP }, { role: 'user', content: userP }];

    const result = await callLlmApi({ apiAddress: llmApiAddress, apiKey: llmApiKey, model: llmModel, messages, customParams: llmCustomParams.reduce((acc,p)=>(p.key?acc[p.key]=p.value:null,acc),{}), timeoutSeconds: translateConfig.timeoutThreshold * 2 }); // Longer timeout

    if (result.success) {
      try {
        const llmResponse = result.data.choices[0].message.content;
        const parsedGlossary = JSON.parse(llmResponse);
        if (Array.isArray(parsedGlossary) && parsedGlossary.every(item => Array.isArray(item) && item.length >= 2)) {
          const newTerms = []; const existingOriginals = new Set(wordTable.map(r => r[0]));
          parsedGlossary.filter(t => t[0] !== "原文" && t[0] !== "original_term").forEach(term => {
            const [original, translation, category = ""] = term;
            if (original && translation && !existingOriginals.has(original)) {
              newTerms.push([String(original), String(translation), String(category)]);
              existingOriginals.add(original); 
            }
          });
          if (newTerms.length > 0) { setWordTable(p => [...p, ...newTerms]); addLog(`Added ${newTerms.length} new terms from LLM.`, 'success'); }
          else { addLog("LLM extracted terms, but no new unique terms found.", 'info'); }
        } else { throw new Error("LLM response is not a valid JSON array of arrays."); }
      } catch (e) { addLog(`Glossary extraction error: ${e.message}. LLM Raw: ${result.data.choices[0].message.content.substring(0,100)}...`, "error"); }
    } else { addLog(`Glossary API call failed: ${result.message}`, "error"); }
  };

  // LLM-Assisted Split (and original for fallback)
  const originalHandleSplitSegment = useCallback((index, cursorPosInTa) => {
    if (!cursorPosInTa || !article || index < 0 || index >= article.length) return;
    addLog(`Performing local split for segment ${index}`, 'detail');
    const segmentToSplit = article[index]; let part1Src="", part2Src="", part1Trans="", part2Trans="";
    if(cursorPosInTa.area === 'original'){ /* ... proportional split logic from previous step ... */ } else { /* ... */ }
    setArticle(prev => [...prev.slice(0,index),{...segmentToSplit, src:part1Src, trans:part1Trans}, {src:part2Src, trans:part2Trans, id:`seg-${Date.now()}`}, ...prev.slice(index+1)]);
  }, [article, addLog]);

  const handleSplitSegmentWithLLM = async (index, cursorPosInTa) => {
    if (!cursorPosInTa || !article || index < 0 || index >= article.length) return;
    const segment = article[index]; const primaryArea = cursorPosInTa.area;
    const primaryText = primaryArea === 'original' ? segment.src : segment.trans;
    const secondaryText = primaryArea === 'original' ? segment.trans : segment.src;

    if (!secondaryText || secondaryText.trim() === '') { addLog("Secondary text empty, local split.", "detail"); originalHandleSplitSegment(index, cursorPosInTa); return; }
    
    const primaryPart1 = primaryText.substring(0, cursorPosInTa.position);
    const primaryPart2 = primaryText.substring(cursorPosInTa.position);

    const promptKey = primaryArea === 'original' ? 'originalTextSplit' : 'translatedTextSplit';
    let systemP = promptsConfig[promptKey].systemPrompt.replace("{{src_lang}}",translateConfig.originalLanguage).replace("{{dst_lang}}",translateConfig.translatedLanguage);
    let userP = promptsConfig[promptKey].userPrompt;
    if (primaryArea === 'original') { userP = userP.replace("{{src_before_split}}",segment.src).replace("{{trans_before_split}}",segment.trans).replace("{{src_split_00}}",primaryPart1).replace("{{src_split_01}}",primaryPart2); }
    else { userP = userP.replace("{{trans_before_split}}",segment.trans).replace("{{src_before_split}}",segment.src).replace("{{trans_split_00}}",primaryPart1).replace("{{trans_split_01}}",primaryPart2); }
    
    addLog(`Requesting LLM assistance for splitting segment ${index} (primary: ${primaryArea})`, "info");
    const messages = [{role:'system',content:systemP},{role:'user',content:userP}];
    const result = await callLlmApi({ apiAddress:llmApiAddress, apiKey:llmApiKey, model:llmModel, messages, customParams: llmCustomParams.reduce((acc,p)=>(p.key?acc[p.key]=p.value:null,acc),{}), timeoutSeconds:translateConfig.timeoutThreshold });

    if (result.success) {
      const parts = (result.data.choices[0].message.content.startsWith("-> ") ? result.data.choices[0].message.content.substring(3) : result.data.choices[0].message.content).split("\n-> ");
      if (parts.length === 2) {
        setArticle(p => [...p.slice(0,index), primaryArea==='original' ? {...segment,src:primaryPart1,trans:parts[0]} : {...segment,src:parts[0],trans:primaryPart1}, primaryArea==='original' ? {src:part2Src,trans:parts[1],id:`seg-${Date.now()}`} : {src:parts[1],trans:part2Src,id:`seg-${Date.now()}`}, ...p.slice(index+1)]);
        addLog(`Segment ${index} split with LLM.`, "success");
      } else { addLog(`LLM split format error for seg ${index}. Fallback.`, "warn"); originalHandleSplitSegment(index, cursorPosInTa); }
    } else { addLog(`LLM split API error for seg ${index}: ${result.message}. Fallback.`, "error"); originalHandleSplitSegment(index, cursorPosInTa); }
  };

  // Translation Workflow (handleStartTranslation, handleStopTranslation)
  const handleStartTranslation = async () => { /* ... (full definition from previous step) ... */ };
  const handleStopTranslation = () => { /* ... (full definition from previous step) ... */ };

  // File Handling & Builders
  const buildLlmConfigForSave = () => ({ api_provider_name: llmApiProviderName, model: llmModel, api_key: llmApiKey, parameter: llmCustomParams.reduce((acc, param) => { if (param.key) acc[param.key] = param.value; return acc; }, {})});
  const buildPromptsForSave = () => Object.entries(promptsConfig).map(([key, val]) => ({ type: key, system: val.systemPrompt, user: val.userPrompt }));
  const handleFileDrop = useCallback(async (event) => { /* ... (full definition, ensure addLog and all states in deps) ... */ }, [llmApiProviderName, llmModel, llmApiKey, llmCustomParams, promptsConfig, translateConfig, article, wordTable, addLog]);
  const processTxtFile = async (file, baseName) => { /* ... (full definition, ensure addLog) ... */ };
  const createAndLogTrsInMemory = async (baseName, articleData, promptsJson, llmConfigJson, currentTranslateConfig, currentWordTable) => { /* ... (full definition, ensure addLog) ... */ };
  const loadTrsFile = async (file) => { /* ... (full definition, ensure addLog and all states set) ... */ };
  useEffect(() => { const dnd=(e)=>{e.preventDefault();e.stopPropagation();}; window.addEventListener('dragover',dnd);window.addEventListener('dragleave',dnd);window.addEventListener('drop',handleFileDrop); return ()=>{window.removeEventListener('dragover',dnd);window.removeEventListener('dragleave',dnd);window.removeEventListener('drop',handleFileDrop);}; }, [handleFileDrop]);

  // Main Content Rendering
  let mainContent;
  if (currentView === 'translation') {
    mainContent = ( <ContentArea {...{ article, onSegmentOriginalChange, onSegmentTranslatedChange, onSplitSegment: handleSplitSegmentWithLLM, onTranslateThisSegment: handleTranslateSegmentPlaceholder, onMergeUp, onMergeDown, onInsertEmptySegmentBelow, onMarkAsChapterStart, onUnmarkChapterStart, onDeleteSegment }} /> );
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
        <Titlebar currentProjectName={currentProjectName} />
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
