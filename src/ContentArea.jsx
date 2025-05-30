import React from 'react';
import BilingualTranslationView from './components/BilingualTranslationView';
import './ContentArea.css';

export default function ContentArea({
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
  return (
    <div className="content-area">
      <BilingualTranslationView
        article={article}
        onSegmentOriginalChange={onSegmentOriginalChange}
        onSegmentTranslatedChange={onSegmentTranslatedChange}
        // Pass down context menu action handlers
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
  );
}
