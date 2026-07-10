import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFViewer = ({ url }) => {
  const [numPages, setNumPages] = useState(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width - 2); // Tiny subtraction for scrollbar
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <div
        ref={containerRef}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#ffffff' }}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div style={{ color: '#999', marginTop: '2rem' }}>Loading PDF...</div>}
          error={<div style={{ color: 'red', marginTop: '2rem' }}>Failed to load PDF. CORS might not be enabled on S3.</div>}
        >
          {Array.from(new Array(numPages), (el, index) => (
            <div key={`page_${index + 1}`} style={{ marginBottom: '0', display: 'flex', justifyContent: 'center' }}>
              <Page
                pageNumber={index + 1}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                width={containerWidth || undefined}
                className="custom-pdf-page"
              />
            </div>
          ))}
        </Document>
      </div>
      <style>{`
        .custom-pdf-page .react-pdf__Page__canvas {
          outline: none !important;
          border: none !important;
        }
        .custom-pdf-page {
          outline: none !important;
          border: none !important;
        }
        .react-pdf__Page {
          box-shadow: none !important;
          border: none !important;
          margin: 0 !important;
          background: #ffffff !important;
        }
      `}</style>
    </div>
  );
};

export default PDFViewer;
