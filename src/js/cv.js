/**
 * cv.js — CV page behaviour
 *
 * The CV is a real HTML page styled as an exact A4 sheet.
 * "Download PDF" opens the browser print dialog with the
 * page already set to A4, zero margins, so the client can
 * save it as a PDF in one click.
 */

(function initCVPage() {
  const downloadBtn = document.getElementById('downloadBtn');
  if (!downloadBtn) return;

  downloadBtn.addEventListener('click', () => {
    window.print();
  });

  /* Keyboard shortcut: Ctrl/Cmd + P is the standard print
     gesture, but the button makes it discoverable. */
})();
