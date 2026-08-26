# DocScan Pro — Professional Edition

A fast, browser-first document scanner and PDF workspace.

Core features:
- Camera scanning
- Image and PDF import
- Multi-page workspace
- Fast local thumbnails
- Page drag-and-drop reordering
- Delete/duplicate/rotate pages
- Document enhancement and filters
- Four-point perspective crop
- Annotation and signature drawing
- Add text
- OCR (lazy-loaded only when used)
- PDF merge/export
- PDF page extraction
- PDF quality control
- JPG/PNG export
- Image compression with explicit targets including below 30 KB
- PDF compression
- Responsive desktop/mobile UI
- No server or account required for the editor

Performance design:
- Heavy PDF/OCR libraries load only when the corresponding feature is used.
- The main editor renders only the active page.
- Thumbnails are downscaled.
- Source files stay local in the browser.

A target such as 30 KB is a best-effort size target, not a guarantee of readable output for every document.
