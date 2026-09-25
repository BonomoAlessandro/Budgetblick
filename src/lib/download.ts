/** Löst den Download einer Textdatei im Browser aus. */
export function downloadTextFile(content: string, fileName: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Verzögert freigeben, damit der Download in allen Browsern startet.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
