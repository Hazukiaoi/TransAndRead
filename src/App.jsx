import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import JSZip from 'jszip';

// Components
import Titlebar from './Titlebar';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';
import LlmConfigView from './components/LlmConfigView';
import PromptConfigView from './components/PromptConfigView';
import TranslateConfigView from './components/TranslateConfigView';
import GlossaryView from './components/GlossaryView';
import ConsoleView from './components/ConsoleView';

// Contexts & Utilities
import { LoggingContext } from './contexts/LoggingContext';
import { segmentArticleForTranslation } from './utils/translationUtils';
import { callLlmApi } from './utils/llmUtils';

// CSS
import './App.css';
import './Titlebar.css';
import './Sidebar.css';
import './ContentArea.css';

// --- Default Configurations ---
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

  // --- Wrapped Setters for Unsaved Changes Tracking ---
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

  // --- Logging ---
  const addLog = useCallback((message, level = 'info') => {
    const timestamp = new Date().toISOString();
    setLogs(pL => { const nL = [...pL, {timestamp,message,level}]; return nL.length > 200 ? nL.slice(nL.length - 200) : nL; });
    if(level==='error')console.error(`[AppLog] ${timestamp} [${level.toUpperCase()}] ${message}`);
    else if(level==='warn')console.warn(`[AppLog] ${timestamp} [${level.toUpperCase()}] ${message}`);
    else console.log(`[AppLog] ${timestamp} [${level.toUpperCase()}] ${message}`);
  }, []);
  const clearLogs = useCallback(() => { setLogs([]); addLog("Console cleared.", "system"); }, [addLog]);

  // --- Segment Editing & Context Menu Actions ---
  const handleSegmentOriginalChange = (index, newText) => setArticle(p => p?.map((s, i) => i === index ? { ...s, src: newText } : s) || null);
  const handleSegmentTranslatedChange = (index, newText) => setArticle(p => p?.map((s, i) => i === index ? { ...s, trans: newText } : s) || null);
  const handleTranslateSegmentPlaceholder = (index) => addLog(`Placeholder: Manual translate segment ${index}`, 'info');
  const handleMergeUp = (index) => { if (!article || index <= 0) return; addLog(`Merging segment ${index} up with ${index-1}`, 'action'); setArticle(p => { const mergedSrc = p[index-1].src + (p[index-1].src && p[index].src ? "\n" : "") + p[index].src; const mergedTrans = p[index-1].trans + (p[index-1].trans && p[index].trans ? "\n" : "") + p[index].trans; return [...p.slice(0, index-1), { ...p[index-1], src: mergedSrc, trans: mergedTrans }, ...p.slice(index + 1)]; }); };
  const handleMergeDown = (index) => { if (!article || index >= article.length - 1) return; addLog(`Merging segment ${index} down with ${index+1}`, 'action'); setArticle(p => { const mergedSrc = p[index].src + (p[index].src && p[index+1].src ? "\n" : "") + p[index+1].src; const mergedTrans = p[index].trans + (p[index].trans && p[index+1].trans ? "\n" : "") + p[index+1].trans; return [...p.slice(0, index), { ...p[index], src: mergedSrc, trans: mergedTrans }, ...p.slice(index + 2)]; }); };
  const handleInsertEmptySegmentBelow = (index) => { if(article===null && index === -1){setArticle([{src:"",trans:"",id:`seg-${Date.now()}`}]); return;} if(!article)return; addLog(`Inserted empty segment below ${index}`, 'action'); setArticle(p => [...p.slice(0, index + 1), { src: "", trans: "", id: `seg-${Date.now()}` }, ...p.slice(index + 1)]);};
  const handleMarkAsChapterStart = (index) => { if(!article)return; addLog(`Marked segment ${index} as chapter start`, 'action'); setArticle(p => p.map((s, i) => i === index ? { ...s, chapters: (s.trans || s.src || "New Chapter").substring(0, 20) } : s ));};
  const handleUnmarkChapterStart = (index) => { if(!article)return; addLog(`Unmarked chapter start for segment ${index}`, 'action'); setArticle(p => p.map((s, i) => { if (i === index) { const { chapters, ...rest } = s; return rest; } return s; }));};
  const handleDeleteSegment = (index) => { if (!article || article.length <= 1) { alert("Cannot delete last segment."); return; } addLog(`Deleted segment ${index}`, 'action'); setArticle(p => p.filter((_, i) => i !== index));};

  const handleBuildGlossary = async () => {
    if (!article || article.length === 0) { addLog("Cannot build glossary: No article.", "warn"); alert("Load article first."); return; }
    addLog("Starting LLM-assisted glossary extraction...", "info");
    const fullSrcText = article.map(seg => seg.src).join("\n").substring(0, 15000);
    let systemP = promptsConfig.glossaryExtraction.systemPrompt.replace("{{src_lang}}",translateConfig.originalLanguage).replace("{{dst_lang}}",translateConfig.translatedLanguage);
    const userP = promptsConfig.glossaryExtraction.userPrompt.replace("{{text}}", fullSrcText);
    const messages = [{ role: 'system', content: systemP }, { role: 'user', content: userP }];
    const result = await callLlmApi({ apiAddress: llmApiAddress, apiKey: llmApiKey, model: llmModel, messages, customParams: llmCustomParams.reduce((acc,p)=>(p.key?acc[p.key]=p.value:null,acc),{}), timeoutSeconds: translateConfig.timeoutThreshold * 2 });
    if (result.success) {
      try {
        const llmResponse = result.data.choices[0].message.content;
        const parsedGlossary = JSON.parse(llmResponse);
        if (Array.isArray(parsedGlossary) && parsedGlossary.every(item => Array.isArray(item) && item.length >= 2)) {
          const newTerms = []; const existingOriginals = new Set(wordTable.map(r => r[0]));
          parsedGlossary.filter(t => t[0] !== "原文" && t[0] !== "original_term").forEach(term => {
            const [original, translation, category = ""] = term;
            if (original && translation && !existingOriginals.has(original)) { newTerms.push([String(original), String(translation), String(category)]); existingOriginals.add(original); }
          });
          if (newTerms.length > 0) { setWordTable(p => [...p, ...newTerms]); addLog(`Added ${newTerms.length} new terms from LLM.`, 'success'); }
          else { addLog("LLM extracted terms, but no new unique terms found.", 'info'); }
        } else { throw new Error("LLM response is not a valid JSON array of arrays."); }
      } catch (e) { addLog(`Glossary extraction error: ${e.message}. LLM Raw: ${result.data.choices[0].message.content.substring(0,100)}...`, "error"); }
    } else { addLog(`Glossary API call failed: ${result.message}`, "error"); }
  };

  const originalHandleSplitSegment = useCallback((index, cursorPosInTa) => {
    if (!cursorPosInTa || !article || index < 0 || index >= article.length) return;
    addLog(`Performing local split for segment ${index}`, 'detail');
    const segmentToSplit = article[index]; let part1Src="", part2Src="", part1Trans="", part2Trans="";
    if(cursorPosInTa.area === 'original'){
        part1Src = segmentToSplit.src.substring(0, cursorPosInTa.position); part2Src = segmentToSplit.src.substring(cursorPosInTa.position);
        const transRatio = segmentToSplit.src.length > 0 ? cursorPosInTa.position / segmentToSplit.src.length : 0.5;
        const transSplitPoint = Math.floor(transRatio * segmentToSplit.trans.length);
        part1Trans = segmentToSplit.trans.substring(0, transSplitPoint); part2Trans = segmentToSplit.trans.substring(transSplitPoint);
    } else {
        part1Trans = segmentToSplit.trans.substring(0, cursorPosInTa.position); part2Trans = segmentToSplit.trans.substring(cursorPosInTa.position);
        const srcRatio = segmentToSplit.trans.length > 0 ? cursorPosInTa.position / segmentToSplit.trans.length : 0.5;
        const srcSplitPoint = Math.floor(srcRatio * segmentToSplit.src.length);
        part1Src = segmentToSplit.src.substring(0, srcSplitPoint); part2Src = segmentToSplit.src.substring(srcSplitPoint);
    }
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
      } else { addLog(`LLM split format error. Fallback. Raw: ${result.data.choices[0].message.content.substring(0,100)}`, "warn"); originalHandleSplitSegment(index, cursorPosInTa); }
    } else { addLog(`LLM split API error: ${result.message}. Fallback.`, "error"); originalHandleSplitSegment(index, cursorPosInTa); }
  };

  // --- Translation Workflow ---
  const handleStartTranslation = async () => {
    if (!article || article.length === 0) { addLog("No article loaded.", "warn"); alert("Please load file."); return; }
    addLog("Starting translation...", "system");
    setIsTranslating(true); setTranslationProgress(0);
    const jobId = Date.now().toString(); setCurrentTranslationJobId(jobId);
    let segmentsToProcess = article.map((seg, index) => ({ ...seg, originalIndexInArticle: index }));
    const alreadyTranslatedCount = article.filter(s => s.trans && s.trans.trim() !== "").length;
    if (alreadyTranslatedCount > 0 && alreadyTranslatedCount < article.length) {
      if (window.confirm("Some segments already translated. Re-translate all? (Cancel to continue with untranslated parts)")) { addLog("User chose to re-translate all.", "info"); }
      else { addLog("User chose to continue with untranslated parts.", "info"); segmentsToProcess = segmentsToProcess.filter(s => !s.trans || s.trans.trim() === "");}
    } else if (alreadyTranslatedCount === article.length) {
      if (!window.confirm("All segments seem translated. Re-translate all?")) { addLog("Translation cancelled: All segments already translated.", "info"); setIsTranslating(false); return; }
      addLog("User chose to re-translate all (already translated) segments.", "info");
    }
    if (segmentsToProcess.length === 0) { addLog("No segments to translate.", "info"); setIsTranslating(false); return;}
    const batches = segmentArticleForTranslation(segmentsToProcess, translateConfig.maxTextLength);
    addLog(`Split into ${batches.length} batches. Max length/batch: ${translateConfig.maxTextLength}. Retries: ${translateConfig.taskRetryThreshold}`, 'detail');
    let totalProcessedInJob = 0;
    for (let i = 0; i < batches.length; i++) {
      if (!isTranslating || currentTranslationJobId !== jobId) { addLog(`Job ${jobId} stopped.`, "warn"); break; }
      const batch = batches[i]; const srcTexts = batch.map(item => item.srcText).join("\n-> ");
      let systemP = promptsConfig.translation.systemPrompt.replace("{{src_lang}}",translateConfig.originalLanguage).replace("{{dst_lang}}",translateConfig.translatedLanguage).replace("{{word_table}}", wordTable.length > 0 ? `Glossary: ${JSON.stringify(wordTable)}` : "No glossary provided.");
      const userP = promptsConfig.translation.userPrompt.replace("{{text}}", `-> ${srcTexts}`);
      const messages = [{ role: 'system', content: systemP }, { role: 'user', content: userP }];
      addLog(`Batch ${i+1}/${batches.length}: Translating ${batch.length} segments...`, 'info');
      let success = false, attempts = 0;
      while(attempts <= translateConfig.taskRetryThreshold && !success) {
        if (!isTranslating || currentTranslationJobId !== jobId) break;
        const result = await callLlmApi({ apiAddress: llmApiAddress, apiKey: llmApiKey, model: llmModel, messages, customParams: llmCustomParams.reduce((acc,p)=>(p.key?acc[p.key]=p.value:null,acc),{}), timeoutSeconds: translateConfig.timeoutThreshold });
        if (result.success) {
            const responseText = result.data.choices[0].message.content;
            const translatedTexts = responseText.startsWith("-> ") ? responseText.substring(3).split("\n-> ") : [responseText];
            if (translatedTexts.length === batch.length) {
                setArticle(prevArt => { const newArt = [...prevArt]; batch.forEach((item, k) => { const originalArticleIndex = item.originalIndexInArticle; if (originalArticleIndex < newArt.length) newArt[originalArticleIndex] = { ...newArt[originalArticleIndex], trans: translatedTexts[k] || "" }; }); return newArt; });
                addLog(`Batch ${i+1} success.`, 'success'); success = true;
            } else { addLog(`Batch ${i+1} response/segment count mismatch. Got ${translatedTexts.length}, expected ${batch.length}. Attempt ${attempts+1}. Resp: ${responseText.substring(0,100)}`, 'warn');}
        } else { addLog(`Batch ${i+1} API error. Attempt ${attempts+1}: ${result.message}`, 'error');}
        attempts++; if(!success && attempts <= translateConfig.taskRetryThreshold) { addLog(`Retrying Batch ${i+1}...`, 'warn'); await new Promise(r => setTimeout(r, 2000)); }
      }
      if (!success) addLog(`Batch ${i+1} failed after ${translateConfig.taskRetryThreshold} retries.`, 'error');
      totalProcessedInJob += batch.length; setTranslationProgress(Math.round((totalProcessedInJob / segmentsToProcess.length) * 100));
    }
    addLog("Translation process ended.", "system");
    if (isTranslating && currentTranslationJobId === jobId) setTranslationProgress(100);
    setIsTranslating(false);
  };
  const handleStopTranslation = () => { if (window.confirm("Stop translation?")) { addLog(`User stopped job ${currentTranslationJobId}.`, "warn"); setIsTranslating(false); }};

  // --- TRS File Packaging and Saving ---
  const buildLlmConfigForSave = () => ({ api_provider_name: llmApiProviderName, model: llmModel, api_key: llmApiKey, parameter: llmCustomParams.reduce((acc, param) => { if (param.key) acc[param.key] = param.value; return acc; }, {})});
  const buildPromptsForSave = () => Object.entries(promptsConfig).map(([key, val]) => ({ type: key, system: val.systemPrompt, user: val.userPrompt }));
  const packageCurrentProjectToTrs = useCallback(() => { /* ... (Full definition from previous step) ... */ }, [article, promptsConfig, llmApiProviderName, llmModel, llmApiKey, llmCustomParams, translateConfig, wordTable, currentProjectName, addLog, buildLlmConfigForSave, buildPromptsForSave]); // Added build helpers to deps
  const handleSaveProject = useCallback(async () => { /* ... (Full definition from previous step) ... */ }, [packageCurrentProjectToTrs, currentProjectName, addLog, article, wordTable]);

  // --- File Handling ---
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
    _setCurrentProjectName(baseName);
    addLog(`Processed TXT: ${file.name}. Segments: ${segments.length}`, 'success');
    setHasUnsavedChanges(true);
  };
  const loadTrsFile = async (file) => { /* ... (Full definition from previous step, ensuring _setters are used for initial load) ... */ };
  const handleFileDrop = useCallback(async (event) => { /* ... (Full definition from previous step) ... */ }, [hasUnsavedChanges, handleSaveProject, processTxtFile, loadTrsFile, addLog]);

  // --- Global Event Listeners (DnD, Ctrl+S, BeforeUnload, Autosave) ---
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
    mainContent = ( <ContentArea article={article} onSegmentOriginalChange={handleSegmentOriginalChange} onSegmentTranslatedChange={handleSegmentTranslatedChange} onSplitSegment={handleSplitSegmentWithLLM} onTranslateThisSegment={handleTranslateSegmentPlaceholder} onMergeUp={handleMergeUp} onMergeDown={handleMergeDown} onInsertEmptySegmentBelow={handleInsertEmptySegmentBelow} onMarkAsChapterStart={handleMarkAsChapterStart} onUnmarkChapterStart={handleUnmarkChapterStart} onDeleteSegment={handleDeleteSegment} /> );
  } else if (currentView === 'llmConfig') {
    mainContent = (<LlmConfigView llmApiAddress={llmApiAddress} setLlmApiAddress={setLlmApiAddress} llmModel={llmModel} setLlmModel={setLlmModel} llmApiKey={llmApiKey} setLlmApiKey={setLlmApiKey} llmCustomParams={llmCustomParams} setLlmCustomParams={setLlmCustomParams} availableModels={availableModels} translateConfig={translateConfig} addLog={addLog} />);
  } else if (currentView === 'promptConfig') {
    mainContent = (<PromptConfigView promptsConfig={promptsConfig} setPromptsConfig={setPromptsConfig} />);
  } else if (currentView === 'translateConfig') {
    mainContent = (<TranslateConfigView translateConfig={translateConfig} setTranslateConfig={setTranslateConfig} />);
  } else if (currentView === 'glossary') {
    mainContent = (<GlossaryView wordTable={wordTable} setWordTable={setWordTable} addLog={addLog} onBuildGlossary={handleBuildGlossary} articleLoaded={!!article && article.length > 0} />);
  } else if (currentView === 'console') {
    mainContent = (<ConsoleView />);
  }

  return (
    <LoggingContext.Provider value={{ logs, addLog, clearLogs }}>
      <div className="app-container" onDrop={handleFileDrop} onDragOver={(e) => e.preventDefault()}>
        <Titlebar currentProjectName={currentProjectName} hasUnsavedChanges={hasUnsavedChanges} onTitleClick={handleSaveProject} />
        <div className="main-layout">
          <PanelGroup direction="horizontal">
            <Panel defaultSize={20} collapsible={true} collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} minSize={10} className="sidebar-panel">
              <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} setCurrentView={setCurrentView} isTranslating={isTranslating} translationProgress={translationProgress} articleLoaded={!!article && article.length > 0} onStartTranslation={handleStartTranslation} onStopTranslation={handleStopTranslation} />
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
