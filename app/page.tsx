'use client';

import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_TO_PX = 3.7795275591; // at 96 DPI

export default function Home() {
  const [text, setText] = useState('');
  const [numColumns, setNumColumns] = useState(8);
  const [fontSize, setFontSize] = useState(12);
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [margin, setMargin] = useState(10);
  const [columnGap, setColumnGap] = useState(5);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [useCustomWidths, setUseCustomWidths] = useState(false);
  const [customWidths, setCustomWidths] = useState<number[]>([]);
  const [pages, setPages] = useState<string[][]>([]);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (text) {
      layoutText();
    } else {
      setPages([]);
    }
  }, [text, numColumns, fontSize, lineSpacing, margin, columnGap, fontFamily, useCustomWidths, customWidths]);

  useEffect(() => {
    setCustomWidths(Array(numColumns).fill(100 / numColumns));
  }, [numColumns]);

  const layoutText = () => {
    const pageWidthPx = A4_WIDTH_MM * MM_TO_PX;
    const pageHeightPx = A4_HEIGHT_MM * MM_TO_PX;
    const marginPx = margin * MM_TO_PX;
    const columnGapPx = columnGap * MM_TO_PX;

    const contentWidth = pageWidthPx - (2 * marginPx);
    const contentHeight = pageHeightPx - (2 * marginPx);

    // Calculate column widths
    let columnWidths: number[];
    if (useCustomWidths && customWidths.length === numColumns) {
      const totalPercentage = customWidths.reduce((a, b) => a + b, 0);
      const totalGapWidth = columnGapPx * (numColumns - 1);
      columnWidths = customWidths.map(pct =>
        (contentWidth - totalGapWidth) * (pct / totalPercentage)
      );
    } else {
      const totalGapWidth = columnGapPx * (numColumns - 1);
      const singleColumnWidth = (contentWidth - totalGapWidth) / numColumns;
      columnWidths = Array(numColumns).fill(singleColumnWidth);
    }

    // Create a temporary div to measure text
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.fontFamily = fontFamily;
    tempDiv.style.fontSize = `${fontSize}px`;
    tempDiv.style.lineHeight = `${lineSpacing}`;
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.wordWrap = 'break-word';
    document.body.appendChild(tempDiv);

    const words = text.split(/(\s+)/);
    const newPages: string[][] = [];
    let currentPage: string[] = Array(numColumns).fill('');
    let currentColumnIndex = 0;

    let wordIndex = 0;
    while (wordIndex < words.length) {
      const word = words[wordIndex];
      const testText = currentPage[currentColumnIndex] + word;

      tempDiv.style.width = `${columnWidths[currentColumnIndex]}px`;
      tempDiv.textContent = testText;

      if (tempDiv.offsetHeight <= contentHeight) {
        currentPage[currentColumnIndex] += word;
        wordIndex++;
      } else {
        // Check if adding just the word exceeds
        tempDiv.textContent = currentPage[currentColumnIndex];
        const currentHeight = tempDiv.offsetHeight;

        if (currentHeight >= contentHeight) {
          // Current column is full, move to next column
          currentColumnIndex++;

          if (currentColumnIndex >= numColumns) {
            // Page is full, start new page
            newPages.push([...currentPage]);
            currentPage = Array(numColumns).fill('');
            currentColumnIndex = 0;
          }
        } else {
          // Try to fit the word
          currentPage[currentColumnIndex] += word;
          wordIndex++;
        }
      }
    }

    // Add the last page if it has content
    if (currentPage.some(col => col.trim())) {
      newPages.push(currentPage);
    }

    document.body.removeChild(tempDiv);
    setPages(newPages);
  };

  const exportToPDF = async () => {
    if (!previewRef.current || pages.length === 0) return;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageElements = previewRef.current.querySelectorAll('.page');

    for (let i = 0; i < pageElements.length; i++) {
      const pageElement = pageElements[i] as HTMLElement;

      const canvas = await html2canvas(pageElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
    }

    pdf.save('multi-column-layout.pdf');
  };

  const exportToImage = async () => {
    if (!previewRef.current || pages.length === 0) return;

    const pageElements = previewRef.current.querySelectorAll('.page');

    for (let i = 0; i < pageElements.length; i++) {
      const pageElement = pageElements[i] as HTMLElement;

      const canvas = await html2canvas(pageElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.download = `page-${i + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Control Panel */}
      <div style={{
        width: '350px',
        background: 'white',
        padding: '20px',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        overflowY: 'auto',
        height: '100vh',
        position: 'sticky',
        top: 0
      }}>
        <h1 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: 'bold' }}>
          Multi-Column A4 Layout
        </h1>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Paste Your Text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here..."
            style={{
              width: '100%',
              height: '150px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Number of Columns: {numColumns}
          </label>
          <input
            type="range"
            min="1"
            max="12"
            value={numColumns}
            onChange={(e) => setNumColumns(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Font Family
          </label>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier New</option>
            <option value="Verdana">Verdana</option>
            <option value="Noto Sans">Noto Sans</option>
            <option value="Noto Sans Malayalam">Noto Sans Malayalam</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Font Size (px): {fontSize}
          </label>
          <input
            type="range"
            min="8"
            max="36"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Line Spacing: {lineSpacing}
          </label>
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={lineSpacing}
            onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Page Margin (mm): {margin}
          </label>
          <input
            type="range"
            min="0"
            max="30"
            value={margin}
            onChange={(e) => setMargin(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Column Gap (mm): {columnGap}
          </label>
          <input
            type="range"
            min="0"
            max="20"
            value={columnGap}
            onChange={(e) => setColumnGap(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useCustomWidths}
              onChange={(e) => setUseCustomWidths(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontWeight: '500' }}>Use Custom Column Widths</span>
          </label>
        </div>

        {useCustomWidths && (
          <div style={{ marginBottom: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
            <p style={{ fontSize: '13px', marginBottom: '10px', color: '#666' }}>
              Column Width Percentages:
            </p>
            {Array.from({ length: numColumns }).map((_, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '3px' }}>
                  Column {i + 1}: {customWidths[i]?.toFixed(1) || 0}%
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="0.5"
                  value={customWidths[i] || 0}
                  onChange={(e) => {
                    const newWidths = [...customWidths];
                    newWidths[i] = parseFloat(e.target.value);
                    setCustomWidths(newWidths);
                  }}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <button
            onClick={exportToPDF}
            disabled={pages.length === 0}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '10px',
              background: pages.length > 0 ? '#0070f3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: pages.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            Export to PDF
          </button>
          <button
            onClick={exportToImage}
            disabled={pages.length === 0}
            style={{
              width: '100%',
              padding: '12px',
              background: pages.length > 0 ? '#10b981' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: pages.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            Export to Images
          </button>
        </div>

        {pages.length > 0 && (
          <div style={{ marginTop: '15px', padding: '10px', background: '#f0f9ff', borderRadius: '4px' }}>
            <p style={{ fontSize: '13px', color: '#0369a1' }}>
              <strong>Pages generated:</strong> {pages.length}
            </p>
          </div>
        )}
      </div>

      {/* Preview Area */}
      <div style={{
        flex: 1,
        padding: '40px',
        overflowY: 'auto',
        background: '#f5f5f5'
      }}>
        <div ref={previewRef}>
          {pages.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999'
            }}>
              <p style={{ fontSize: '18px' }}>Paste text to see preview</p>
            </div>
          ) : (
            pages.map((pageColumns, pageIndex) => (
              <div
                key={pageIndex}
                className="page"
                style={{
                  width: `${A4_WIDTH_MM * MM_TO_PX}px`,
                  height: `${A4_HEIGHT_MM * MM_TO_PX}px`,
                  background: 'white',
                  margin: '0 auto 30px',
                  padding: `${margin * MM_TO_PX}px`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  display: 'flex',
                  gap: `${columnGap * MM_TO_PX}px`,
                  position: 'relative'
                }}
              >
                {pageColumns.map((columnText, colIndex) => {
                  const pageWidthPx = A4_WIDTH_MM * MM_TO_PX;
                  const marginPx = margin * MM_TO_PX;
                  const columnGapPx = columnGap * MM_TO_PX;
                  const contentWidth = pageWidthPx - (2 * marginPx);

                  let columnWidth: number;
                  if (useCustomWidths && customWidths.length === numColumns) {
                    const totalPercentage = customWidths.reduce((a, b) => a + b, 0);
                    const totalGapWidth = columnGapPx * (numColumns - 1);
                    columnWidth = (contentWidth - totalGapWidth) * (customWidths[colIndex] / totalPercentage);
                  } else {
                    const totalGapWidth = columnGapPx * (numColumns - 1);
                    columnWidth = (contentWidth - totalGapWidth) / numColumns;
                  }

                  return (
                    <div
                      key={colIndex}
                      style={{
                        width: `${columnWidth}px`,
                        fontFamily: fontFamily,
                        fontSize: `${fontSize}px`,
                        lineHeight: `${lineSpacing}`,
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        overflow: 'hidden'
                      }}
                    >
                      {columnText}
                    </div>
                  );
                })}
                <div style={{
                  position: 'absolute',
                  bottom: '5px',
                  right: '10px',
                  fontSize: '10px',
                  color: '#999'
                }}>
                  Page {pageIndex + 1}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
