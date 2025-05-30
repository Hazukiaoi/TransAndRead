import React, { useState, useEffect } from 'react';
import './GlossaryView.css';
import { useLogger } from '../contexts/LoggingContext';


export default function GlossaryView({ wordTable, setWordTable, onBuildGlossary, articleLoaded }) {
  const { addLog } = useLogger();
  const [editableCell, setEditableCell] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isBuilding, setIsBuilding] = useState(false);


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
    setEditableCell(null);
  };

  const handleKeyPress = (e, rowIndex, colIndex) => {
    if (e.key === 'Enter') {
        setEditableCell(null);
        if (colIndex < 2) {
            setEditableCell({rowIndex, colIndex: colIndex + 1});
        } else if (rowIndex < wordTable.length -1) {
            setEditableCell({rowIndex: rowIndex + 1, colIndex: 0});
        }
    } else if (e.key === 'Escape') {
        setEditableCell(null);
    }
  };

  const handleAddTerm = () => {
    setWordTable([...(wordTable || []), ["", "", ""]]);
    addLog("Added new empty term to glossary.", "action");
  };

  const handleRowSelection = (rowIndex) => {
    setSelectedRows(prevSelectedRows => {
      const newSelectedRows = new Set(prevSelectedRows);
      if (newSelectedRows.has(rowIndex)) newSelectedRows.delete(rowIndex);
      else newSelectedRows.add(rowIndex);
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
    addLog(`Deleted ${selectedRows.size} selected terms from glossary.`, "action");
    setSelectedRows(new Set());
  };

  const handleDeleteSingleTerm = (rowIndex) => {
    const termToDelete = wordTable[rowIndex];
    const newTable = wordTable.filter((_, index) => index !== rowIndex);
    setWordTable(newTable);
    addLog(`Deleted term: [${termToDelete.join(', ')}] from glossary.`, "action");
    setSelectedRows(prev => { prev.delete(rowIndex); return new Set(prev); });
  };

  const triggerBuildGlossary = async () => {
    if (!articleLoaded) {
        alert("Please load an article first to extract glossary from.");
        addLog("Build Glossary attempt failed: No article loaded.", "warn");
        return;
    }
    setIsBuilding(true);
    addLog("Starting glossary extraction...", "info");
    await onBuildGlossary(); // This is passed from App.jsx
    setIsBuilding(false);
    // addLog result is handled in App.jsx's onBuildGlossary
  };

  const handleExportGlossary = () => {
    if (!wordTable || wordTable.length === 0) {
      alert("Glossary is empty. Nothing to export.");
      addLog("Export Glossary failed: Glossary is empty.", "warn");
      return;
    }
    const exportData = [["原文", "译文", "分类"], ...wordTable];
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'glossary.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    addLog("Glossary exported as glossary.json.", "info");
  };

  const handleClearGlossary = () => {
    if (window.confirm("Are you sure you want to clear the entire glossary? This cannot be undone.")) {
      setWordTable([]);
      setSelectedRows(new Set());
      addLog("Glossary cleared by user.", "action");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
        // Check if the active element is part of the glossary table or its controls
        // to avoid conflicts with other global listeners or text inputs.
        const isGlossaryActive = document.querySelector('.glossary-view')?.contains(document.activeElement)
                                 || document.activeElement.tagName === 'BODY'; // Or if body is active

        if (e.key === 'Delete' && selectedRows.size > 0 && isGlossaryActive) {
            if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) &&
                !document.activeElement.closest('.glossary-table-container')) { // Ensure not in table input
                return;
            }
            handleDeleteSelectedTerms();
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedRows, wordTable]); // Ensure dependencies are correct

  return (
    <div className="glossary-view">
      <h2>词表 (Glossary)</h2>
      <div className="glossary-actions">
        <button onClick={handleAddTerm}>Add Term (+)</button>
        <button onClick={handleDeleteSelectedTerms} disabled={selectedRows.size === 0}>Delete Selected</button>
        <button onClick={triggerBuildGlossary} className={isBuilding ? "building" : ""} disabled={isBuilding || !articleLoaded} title={!articleLoaded ? "Load an article first" : ""}>
          {isBuilding ? "Building..." : "Build Glossary (构建词表)"}
        </button>
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
                      <span>{cell || ""}</span> {/* Ensure empty cells render the span for clickability */}
                    )}
                  </td>
                ))}
                <td className="action-col">
                    <button onClick={() => handleDeleteSingleTerm(rowIndex)} className="delete-row-btn" title="Delete this term">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!wordTable || wordTable.length === 0) && <p className="empty-glossary-message">Glossary is empty. Click "Add Term" to start or "Build Glossary" from an article.</p>}
      </div>
    </div>
  );
}
