import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFViewer = ({ url }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
          disabled={pageNumber <= 1}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: pageNumber <= 1 ? '#ccc' : '#111' }}
        >
          Previous
        </button>
        <span style={{ fontSize: '0.9rem', color: '#666' }}>
          Page {pageNumber} of {numPages || '--'}
        </span>
        <button 
          onClick={() => setPageNumber(Math.min(numPages || 1, pageNumber + 1))}
          disabled={pageNumber >= (numPages || 1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: pageNumber >= (numPages || 1) ? '#ccc' : '#111' }}
        >
          Next
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '2rem', background: '#fff' }}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div style={{ color: '#999' }}>Loading PDF...</div>}
          error={<div style={{ color: 'red' }}>Failed to load PDF. CORS might not be enabled on S3.</div>}
        >
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="custom-pdf-page"
          />
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;
