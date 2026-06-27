import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';

/**
 * Strips oklch() color values from an element tree before html2canvas capture.
 * Tailwind CSS v4 outputs oklch() which html2canvas cannot parse.
 * Converts to browser-resolved rgb() via a temporary canvas 2D context.
 */
function stripOklchColors(root: HTMLElement): (() => void) {
  const backups: { el: HTMLElement; prop: string; original: string }[] = [];
  const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];
  
  // Create a temporary canvas for color resolution
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 1;
  tempCanvas.height = 1;
  const ctx = tempCanvas.getContext('2d');

  function resolveColor(value: string): string {
    if (!ctx) return value;
    if (!value || !value.includes('oklch')) return value;
    
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000000'; // reset
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      return `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${(pixel[3] / 255).toFixed(2)})`;
    } catch {
      return value;
    }
  }

  const allElements = [root, ...Array.from(root.querySelectorAll('*'))] as HTMLElement[];

  for (const el of allElements) {
    if (!(el instanceof HTMLElement)) continue;
    const computed = window.getComputedStyle(el);

    for (const prop of colorProps) {
      const val = computed.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
      if (val && val.includes('oklch')) {
        const resolved = resolveColor(val);
        const camelProp = prop as keyof CSSStyleDeclaration;
        backups.push({ el, prop: camelProp as string, original: (el.style as any)[camelProp] });
        (el.style as any)[camelProp] = resolved;
      }
    }
  }

  // Return a restore function
  return () => {
    for (const { el, prop, original } of backups) {
      (el.style as any)[prop] = original;
    }
  };
}

export const generateCertificatePDF = async (canvasElement: HTMLElement): Promise<Blob> => {
  // Capture canvas layout using html2canvas
  const originalTransform = canvasElement.style.transform;
  canvasElement.style.transform = 'scale(1)';

  // Strip oklch colors before capture
  const restoreColors = stripOklchColors(canvasElement);

  console.time('1. Certificate Rendering');
  const canvas = await html2canvas(canvasElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: null
  });
  console.timeEnd('1. Certificate Rendering');

  // Restore original styles
  restoreColors();
  canvasElement.style.transform = originalTransform;

  console.time('2. PDF Generation');
  const imgDataUrl = canvas.toDataURL('image/jpeg', 0.82);

  // Convert DataURL image to ArrayBuffer
  const response = await fetch(imgDataUrl);
  const imgBytes = await response.arrayBuffer();

  // Create a pdf-lib Document
  const pdfDoc = await PDFDocument.create();
  // A4 standard Landscape dimensions in points is 842 x 595
  const page = pdfDoc.addPage([842, 595]);

  // Embed the captured image
  const img = await pdfDoc.embedJpg(imgBytes);

  // Draw the image exactly to the edges
  page.drawImage(img, {
    x: 0,
    y: 0,
    width: 842,
    height: 595
  });

  const pdfBytes = await pdfDoc.save();
  console.timeEnd('2. PDF Generation');
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
};

export const downloadPDFBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
