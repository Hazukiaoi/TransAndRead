import React, { useState, useEffect } from 'react';
import './GlossaryView.css';

export default function GlossaryView({ wordTable, setWordTable }) {
  const [editableCell, setEditableCell] = useState(null); // { rowIndex, colIndex }
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Make a local copy to enable direct editing before "saving" back to App state if needed,
  // or operate directly on wordTable via setWordTable for simplicity.
  // For now, direct modification for simplicity.
  // const [localWordTable, setLocalWordTable] = useState([]);
  // useEffect(() => { setLocalWordTable(wordTable || []); }, [wordTable]);

  const handleCellClick = (rowIndex, colIndex) => {
    setEditableCell({ rowIndex, colIndex });
  };

  const handleCellChange = (e, rowIndex, colIndex) => {
    const newValue = e.target.value;
    const updatedTable = wordTable.map((row, rIdx) => 
      rIdx === rowIndex ? row.map((cell, cIdx) => (cIdx === colIndex ? newValue : cell)) : row
    );
    setWordTable(updatedTable);
  };

  const handleCellBlur = () => {
    setEditableCell(null); // Finish editing when focus is lost
  };
  
  const handleKeyPress = (e, rowIndex, colIndex) => {
    if (e.key === 'Enter') {
        setEditableCell(null);
        // Optionally move to next cell or row
        if (colIndex < 2) {
            setEditableCell({rowIndex, colIndex: colIndex + 1});
        } else if (rowIndex < wordTable.length -1) {
            setEditableCell({rowIndex: rowIndex + 1, colIndex: 0});
        }
    } else if (e.key === 'Escape') {
        setEditableCell(null);
        // TODO: Revert cell change if needed, though current setup saves on change.
    }
  };

  const handleAddTerm = () => {
    setWordTable([...(wordTable || []), ["", "", ""]]);
  };

  const handleRowSelection = (rowIndex) => {
    setSelectedRows(prevSelectedRows => {
      const newSelectedRows = new Set(prevSelectedRows);
      if (newSelectedRows.has(rowIndex)) {
        newSelectedRows.delete(rowIndex);
      } else {
        newSelectedRows.add(rowIndex);
      }
      return newSelectedRows;
    });
  };
  
  const handleDeleteSelectedTerms = () => {
    if (selectedRows.size === 0) {
        alert("No terms selected for deletion.");
        return;
    }
    const newTable = wordTable.filter((_, index) => !selectedRows.has(index));
    setWordTable(newTable);
    setSelectedRows(new Set());
  };
  
  const handleDeleteSingleTerm = (rowIndex) => {
    const newTable = wordTable.filter((_, index) => index !== rowIndex);
    setWordTable(newTable);
    setSelectedRows(prev => { // Ensure deleted row is removed from selection
        prev.delete(rowIndex);
        return new Set(prev);
    });
  };


  const handleBuildGlossary = () => {
    console.log("Placeholder: Build Glossary button clicked.");
    alert("Build Glossary functionality not yet implemented.");
  };

  const handleExportGlossary = () => {
    if (!wordTable || wordTable.length === 0) {
      alert("Glossary is empty. Nothing to export.");
      return;
    }
    // Add header row as per design document for export
    const exportData = [["原文", "译文", "分类"], ...wordTable];
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glossary.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Export Glossary: glossary.json file download initiated.");
  };

  const handleClearGlossary = () => {
    if (window.confirm("Are you sure you want to clear the entire glossary? This cannot be undone.")) {
      setWordTable([]);
      setSelectedRows(new Set());
    }
  };
  
  // Keyboard accessibility for delete
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === 'Delete' && selectedRows.size > 0 && currentView === 'glossary') { // Assuming currentView is available or this component is only active then
            // Prevent interference if an input field is focused
            if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                return;
            }
            handleDeleteSelectedTerms();
        }
    };
    // This assumes `GlossaryView` is the active view. A more robust solution might need a global key listener manager
    // or pass down a prop indicating if this view is active to attach/detach listener.
    // For now, will attach it if wordTable is provided (i.e., component is likely active).
    if (wordTable) { // Simple check
        document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedRows, wordTable]); // Rerun if selection or table changes

  return (
    <div className="glossary-view">
      <h2>词表 (Glossary)</h2>
      <div className="glossary-actions">
        <button onClick={handleAddTerm}>Add Term (+)</button>
        <button onClick={handleDeleteSelectedTerms} disabled={selectedRows.size === 0}>Delete Selected</button>
        <button onClick={handleBuildGlossary} className="placeholder-button">Build Glossary (构建词表)</button>
        <button onClick={handleExportGlossary}>Export Glossary (导出词表)</button>
        <button onClick={handleClearGlossary} className="danger-button">Clear Glossary (清空)</button>
      </div>
      <div className="glossary-table-container">
        <table>
          <thead>
            <tr>
              <th className="select-col">Select</th>
              <th>原文 (Original)</th>
              <th>译文 (Translation)</th>
              <th>分类 (Category)</th>
              <th className="action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(wordTable || []).map((row, rowIndex) => (
              <tr key={rowIndex} className={selectedRows.has(rowIndex) ? 'selected-row' : ''}>
                <td className="select-col">
                  <input 
                    type="checkbox" 
                    checked={selectedRows.has(rowIndex)}
                    onChange={() => handleRowSelection(rowIndex)} 
                  />
                </td>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} onClick={() => handleCellClick(rowIndex, colIndex)}>
                    {editableCell && editableCell.rowIndex === rowIndex && editableCell.colIndex === colIndex ? (
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(e, rowIndex, colIndex)}
                        onBlur={handleCellBlur}
                        onKeyDown={(e) => handleKeyPress(e, rowIndex, colIndex)}
                        autoFocus
                      />
                    ) : (
                      <span>{cell}</span>
                    )}
                  </td>
                ))}
                <td className="action-col">
                    <button onClick={() => handleDeleteSingleTerm(rowIndex)} className="delete-row-btn">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!wordTable || wordTable.length === 0) && <p className="empty-glossary-message">Glossary is empty. Click "Add Term" to start.</p>}
      </div>
    </div>
  );
}
