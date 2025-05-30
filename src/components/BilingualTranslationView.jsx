import React, { useState, useEffect, useRef } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import BilingualTextBox from './BilingualTextBox';
import './BilingualTranslationView.css';

export default function BilingualTranslationView({
  article,
  onSegmentOriginalChange,
  onSegmentTranslatedChange,
  // Context menu action handlers
  onSplitSegment,
  onTranslateThisSegment,
  onMergeUp,
  onMergeDown,
  onInsertEmptySegmentBelow,
  onMarkAsChapterStart,
  onUnmarkChapterStart,
  onDeleteSegment,
}) {
  const [chaptersCollapsed, setChaptersCollapsed] = useState(false);
  const [activeChapterIndex, setActiveChapterIndex] = useState(-1); // To highlight active chapter
  const segmentRefs = useRef([]); // To store refs for scrolling

  const isFileOpen = article && article.length > 0;

  // Update segmentRefs array size when article changes
  useEffect(() => {
    segmentRefs.current = segmentRefs.current.slice(0, article ? article.length : 0);
  }, [article]);


  if (!isFileOpen) {
    return (
      <div className="placeholder-message">
        <strong>请把TXT文档 或者 TRS工程文件拖到窗口上打开</strong>
      </div>
    );
  }

  const chapters = !article ? [] : article.reduce((acc, segment, index) => {
    if (segment.chapters) {
      acc.push({ title: segment.chapters, index, id: `segment-${index}` });
    } else if (index === 0 && !segment.chapters && article.length > 0) {
      acc.push({ title: "Default Chapter", index, id: `segment-${index}` });
    }
    return acc;
  }, []);

  const scrollToSegment = (segmentIndex) => {
    if (segmentRefs.current[segmentIndex]) {
      segmentRefs.current[segmentIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'start', // or 'center'
      });
      // Optionally highlight the segment or chapter
      // For now, just scrolling.
    }
     setActiveChapterIndex(segmentIndex); // Highlight the chapter in list
  };


  return (
    <div className="bilingual-translation-view">
      <PanelGroup direction="horizontal">
        <Panel
          collapsible={true}
          collapsed={chaptersCollapsed}
          onCollapse={setChaptersCollapsed}
          defaultSize={20}
          minSize={10}
          className="chapter-list-panel"
        >
          <div className={`chapter-list ${chaptersCollapsed ? 'collapsed' : ''}`}>
            <button onClick={() => setChaptersCollapsed(!chaptersCollapsed)} className="collapse-button">
              {chaptersCollapsed ? '➡️' : '⬅️'} Chapters
            </button>
            {!chaptersCollapsed && (
              <ul>
                {chapters.length > 0 ? (
                  chapters.map((chap) => (
                    <li
                      key={chap.id}
                      onClick={() => scrollToSegment(chap.index)}
                      className={activeChapterIndex === chap.index ? 'active-chapter' : ''}
                    >
                      {chap.title}
                    </li>
                  ))
                ) : (
                  <li>No chapters defined</li>
                )}
              </ul>
            )}
          </div>
        </Panel>
        <PanelResizeHandle className="view-resize-handle" />
        <Panel className="main-text-area-panel">
          <div className="main-text-area">
            {article.map((segment, index) => (
              <div key={segment.id || index} ref={el => segmentRefs.current[index] = el} id={`segment-${index}`}>
                <BilingualTextBox
                  segmentIndex={index}
                  originalText={segment.src}
                  translatedText={segment.trans}
                  isFirstSegment={index === 0}
                  isLastSegment={index === article.length - 1}
                  isChapterStart={!!segment.chapters}
                  onOriginalChange={(newText) => onSegmentOriginalChange(index, newText)}
                  onTranslatedChange={(newText) => onSegmentTranslatedChange(index, newText)}
                  // Pass context menu action handlers
                  onSplitSegment={onSplitSegment}
                  onTranslateThisSegment={onTranslateThisSegment}
                  onMergeUp={onMergeUp}
                  onMergeDown={onMergeDown}
                  onInsertEmptySegmentBelow={onInsertEmptySegmentBelow}
                  onMarkAsChapterStart={onMarkAsChapterStart}
                  onUnmarkChapterStart={onUnmarkChapterStart}
                  onDeleteSegment={onDeleteSegment}
                />
              </div>
            ))}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
