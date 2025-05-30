import React, { useState, useEffect, useRef } from 'react';
import './BilingualTextBox.css';
import ContextMenu from './ContextMenu'; // Import ContextMenu

export default function BilingualTextBox({
  segmentIndex, // Index of this segment in the article array
  originalText = '',
  translatedText = '',
  isFirstSegment, // Boolean to disable "Merge Up"
  isLastSegment,  // Boolean to disable "Merge Down"
  isChapterStart, // Boolean to toggle "Mark/Unmark Chapter Start"
  onOriginalChange,
  onTranslatedChange,
  // Action handlers from App.jsx
  onSplitSegment,
  onTranslateThisSegment, // Placeholder for now
  onMergeUp,
  onMergeDown,
  onInsertEmptySegmentBelow,
  onMarkAsChapterStart,
  onUnmarkChapterStart,
  onDeleteSegment,
}) {
  const [currentOriginal, setCurrentOriginal] = useState(originalText);
  const [currentTranslated, setCurrentTranslated] = useState(translatedText);

  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    cursorPosInTa: null, // { area: 'original' | 'translated', position: number }
  });
  
  const originalTextAreaRef = useRef(null);
  const translatedTextAreaRef = useRef(null);


  useEffect(() => { setCurrentOriginal(originalText); }, [originalText]);
  useEffect(() => { setCurrentTranslated(translatedText); }, [translatedText]);

  const handleTextChange = (area, value) => {
    if (area === 'original') {
      setCurrentOriginal(value);
      if (onOriginalChange) onOriginalChange(value);
    } else {
      setCurrentTranslated(value);
      if (onTranslatedChange) onTranslatedChange(value);
    }
  };
  
  const adjustHeight = (event) => {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleContextMenu = (event, area) => {
    event.preventDefault();
    const targetTextArea = area === 'original' ? originalTextAreaRef.current : translatedTextAreaRef.current;
    const cursorPos = targetTextArea ? targetTextArea.selectionStart : 0;

    setContextMenu({
      show: true,
      x: event.pageX,
      y: event.pageY,
      cursorPosInTa: { area, position: cursorPos },
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, show: false, cursorPosInTa: null }));
  };

  const menuItems = [
    { 
      label: '从这里分两段 (Split here)', 
      action: () => onSplitSegment(segmentIndex, contextMenu.cursorPosInTa),
      disabled: !onSplitSegment || contextMenu.cursorPosInTa === null
    },
    { 
      label: '翻译这一段 (Translate this segment)', 
      action: () => onTranslateThisSegment(segmentIndex),
      disabled: !onTranslateThisSegment
    },
    { 
      label: '向上合并 (Merge up)', 
      action: () => onMergeUp(segmentIndex), 
      disabled: !onMergeUp || isFirstSegment 
    },
    { 
      label: '向下合并 (Merge down)', 
      action: () => onMergeDown(segmentIndex), 
      disabled: !onMergeDown || isLastSegment 
    },
    { 
      label: '下方插入空段 (Insert empty segment below)', 
      action: () => onInsertEmptySegmentBelow(segmentIndex),
      disabled: !onInsertEmptySegmentBelow
    },
    isChapterStart ? { 
      label: '取消章节指定 (Unmark chapter start)', 
      action: () => onUnmarkChapterStart(segmentIndex),
      disabled: !onUnmarkChapterStart
    } : { 
      label: '指定为章节开头 (Mark as chapter start)', 
      action: () => onMarkAsChapterStart(segmentIndex),
      disabled: !onMarkAsChapterStart
    },
    { type: 'separator' }, // Visual separator if ContextMenu supports it
    { 
      label: '删除选定 (Delete selected)', 
      action: () => onDeleteSegment(segmentIndex),
      disabled: !onDeleteSegment
    },
  ];

  return (
    <div className="bilingual-textbox" onContextMenu={(e) => e.preventDefault()}> {/* Prevent outer default */}
      <textarea
        ref={originalTextAreaRef}
        className="original-text-area"
        value={currentOriginal}
        onChange={(e) => handleTextChange('original', e.target.value)}
        onInput={adjustHeight}
        placeholder="Original text..."
        rows={1}
        onContextMenu={(e) => handleContextMenu(e, 'original')}
      />
      <textarea
        ref={translatedTextAreaRef}
        className="translated-text-area"
        value={currentTranslated}
        onChange={(e) => handleTextChange('translated', e.target.value)}
        onInput={adjustHeight}
        placeholder="Translated text..."
        rows={1}
        onContextMenu={(e) => handleContextMenu(e, 'translated')}
      />
      <ContextMenu
        xPos={contextMenu.x}
        yPos={contextMenu.y}
        menuItems={menuItems}
        showMenu={contextMenu.show}
        onClose={closeContextMenu}
      />
    </div>
  );
}
