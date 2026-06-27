import { create } from 'zustand';
import type { DesignerElement, TemplateData } from '../services/certificates';

interface CertSettings {
  org: string;
  title: string;
  course: string;
  body: string;
  signatory: string;
  role: string;
  date: string;
  prefix: string;
  verifyUrl: string;
  colorBg: string;
  colorAccent: string;
  colorText: string;
}

interface DesignerState {
  elements: DesignerElement[];
  selectedId: string | null;
  zoom: number;
  canvasSize: 'a4-landscape' | 'a4-portrait' | 'hd' | 'wide';
  canvasWidth: number;
  canvasHeight: number;
  certSettings: CertSettings;
  currentTemplate: string;
  background: string;
  backgroundImage: string;
  
  // History stack
  historyStack: string[]; // JSON snapshots
  historyIndex: number;

  setElements: (elements: DesignerElement[]) => void;
  addElement: (type: DesignerElement['type'], defaultValue?: string) => void;
  updateElement: (id: string, updates: Partial<DesignerElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFit: (containerWidth: number, containerHeight: number) => void;
  
  setCanvasSize: (size: DesignerState['canvasSize']) => void;
  setTemplate: (themeName: string) => void;
  updateCertSettings: (settings: Partial<CertSettings>) => void;
  
  // History controls
  captureHistory: () => void;
  undo: () => void;
  redo: () => void;
  resetDesigner: () => void;
  loadTemplate: (template: TemplateData) => void;
}

const defaultCertSettings: CertSettings = {
  org: 'CertForge Academy',
  title: 'Certificate of Achievement',
  course: 'Advanced Web Development',
  body: 'This certificate is proudly presented in recognition of outstanding performance and dedication to excellence.',
  signatory: 'Dr. Jane Smith',
  role: 'Program Director',
  date: new Date().toISOString().split('T')[0],
  prefix: 'CF',
  verifyUrl: 'https://certforge-web.web.app/verify.html',
  colorBg: '#fdfbf7',
  colorAccent: '#d4af37',
  colorText: '#1a1a1a',
};

const loadLocalCertSettings = (): CertSettings => {
  try {
    const data = localStorage.getItem('cf_certSettings');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed) {
        return { ...defaultCertSettings, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to load local certSettings:', e);
  }
  return defaultCertSettings;
};

const initialCertSettings = loadLocalCertSettings();


const defaultElements: DesignerElement[] = [
  { id: 'el_border', type: 'border', left: '20px', top: '20px', styles: { width: 'calc(100% - 40px)', height: 'calc(100% - 40px)', border: '4px double #d4af37' } },
  { id: 'el_org', type: 'text', role: 'organisation', left: '271px', top: '60px', value: 'Organisation', styles: { fontSize: '14px', fontWeight: '600', textAlign: 'center', fontFamily: 'Inter', width: '300px' } },
  { id: 'el_title', type: 'text', role: 'title', left: '221px', top: '120px', value: 'Certificate of Achievement', styles: { fontSize: '36px', fontWeight: '800', textAlign: 'center', fontFamily: 'Cinzel', width: '400px' } },
  { id: 'el_div', type: 'divider', left: '321px', top: '180px', styles: { width: '200px', height: '2px', border: 'none' } },
  { id: 'el_p', type: 'text', role: 'body_intro', left: '271px', top: '220px', value: 'This certificate is proudly presented to', styles: { fontSize: '14px', fontWeight: '400', textAlign: 'center', fontFamily: 'Inter', width: '300px' } },
  { id: 'el_name', type: 'text', role: 'recipient_name', left: '221px', top: '270px', value: 'Recipient Name', styles: { fontSize: '32px', fontWeight: '700', textAlign: 'center', fontFamily: 'Playfair Display', width: '400px' } },
  { id: 'el_course', type: 'text', role: 'course_title', left: '246px', top: '330px', value: 'Course Title', styles: { fontSize: '18px', fontWeight: '500', textAlign: 'center', fontFamily: 'Inter', width: '350px' } },
  { id: 'el_date', type: 'text', role: 'date', left: '200px', top: '470px', value: 'Date', styles: { fontSize: '12px', fontWeight: '500', textAlign: 'center', fontFamily: 'Inter', width: '150px' } },
  { id: 'el_sig', type: 'text', role: 'signature', left: '540px', top: '470px', value: 'Signature', styles: { fontSize: '14px', fontWeight: '500', fontStyle: 'italic', textAlign: 'center', fontFamily: 'Alex Brush', width: '150px' } },
  { id: 'el_certid', type: 'text', role: 'cert-id', left: '271px', top: '530px', value: 'CERT-ID', styles: { fontSize: '10px', fontWeight: '400', textAlign: 'center', fontFamily: 'Inter', width: '300px' } },
  { id: 'el_qr', type: 'qr', left: '700px', top: '450px', styles: { width: '100px', height: '100px' } },
  { id: 'el_seal', type: 'seal', left: '380px', top: '420px', styles: { width: '80px', height: '80px', border: '3px double #d4af37' } }
];

const sizeMap = {
  'a4-landscape': [842, 595],
  'a4-portrait': [595, 842],
  'hd': [960, 540],
  'wide': [1200, 675],
};

const getThemeBg = (theme: string) => {
  switch (theme) {
    case 'gold': return 'linear-gradient(135deg, #fdfbf7 0%, #f3e5ab 100%)';
    case 'violet': return 'linear-gradient(135deg, #f5f3ff 0%, #c4b5fd 100%)';
    case 'teal': return 'linear-gradient(135deg, #f0fdfa 0%, #5eead4 100%)';
    case 'ember': return 'linear-gradient(135deg, #fff7ed 0%, #fdba74 100%)';
    case 'light': return '#ffffff';
    case 'forest': return 'linear-gradient(135deg, #f0fdf4 0%, #86efac 100%)';
    default: return '#ffffff';
  }
};

export const useDesignerStore = create<DesignerState>((set, get) => {
  const serializeState = (state: DesignerState) => {
    return JSON.stringify({
      elements: state.elements,
      background: state.background,
      backgroundImage: state.backgroundImage,
      canvasSize: state.canvasSize,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      certSettings: state.certSettings,
      currentTemplate: state.currentTemplate
    });
  };

  const applySnapshot = (snapshotStr: string) => {
    try {
      const snap = JSON.parse(snapshotStr);
      set({
        elements: snap.elements,
        background: snap.background,
        backgroundImage: snap.backgroundImage,
        canvasSize: snap.canvasSize,
        canvasWidth: snap.canvasWidth,
        canvasHeight: snap.canvasHeight,
        certSettings: snap.certSettings,
        currentTemplate: snap.currentTemplate,
        selectedId: null
      });
    } catch (e) {
      console.error('Failed to restore snapshot:', e);
    }
  };

  return {
    elements: defaultElements,
    selectedId: null,
    zoom: 1.0,
    canvasSize: 'a4-landscape',
    canvasWidth: 842,
    canvasHeight: 595,
    certSettings: initialCertSettings,
    currentTemplate: 'gold',
    background: 'linear-gradient(135deg, #fdfbf7 0%, #f3e5ab 100%)',
    backgroundImage: '',
    
    historyStack: [JSON.stringify({
      elements: defaultElements,
      background: 'linear-gradient(135deg, #fdfbf7 0%, #f3e5ab 100%)',
      backgroundImage: '',
      canvasSize: 'a4-landscape',
      canvasWidth: 842,
      canvasHeight: 595,
      certSettings: initialCertSettings,
      currentTemplate: 'gold'
    })],
    historyIndex: 0,

    setElements: (elements) => set({ elements }),

    addElement: (type, defaultValue = '') => {
      const id = `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newEl: DesignerElement = {
        id,
        type,
        left: '200px',
        top: '200px',
      };

      if (type === 'text') {
        newEl.value = defaultValue || 'New Text';
        newEl.styles = {
          fontSize: '14px',
          fontWeight: '400',
          color: '#000000',
          textAlign: 'left',
          fontFamily: 'Inter',
          width: '200px',
        };
      } else if (type === 'qr') {
        newEl.styles = {
          width: '100px',
          height: '100px',
        };
      } else if (type === 'divider') {
        newEl.styles = {
          width: '150px',
          height: '2px',
          color: '#d4af37',
        };
      } else if (type === 'seal') {
        newEl.styles = {
          width: '80px',
          height: '80px',
          border: '3px double #d4af37',
        };
      } else if (type === 'border') {
        newEl.left = '20px';
        newEl.top = '20px';
        newEl.styles = {
          width: 'calc(100% - 40px)',
          height: 'calc(100% - 40px)',
          border: '4px double #d4af37',
        };
      } else if (type === 'image') {
        newEl.value = defaultValue || '';
        newEl.styles = {
          width: '120px',
          height: '120px',
          zIndex: 10,
          opacity: 1,
          borderRadius: '0px'
        };
      }

      set((state) => {
        const updated = {
          elements: [...state.elements, newEl],
          selectedId: id,
        };
        setTimeout(() => get().captureHistory(), 0);
        return updated;
      });
    },

    updateElement: (id, updates) => {
      set((state) => {
        const nextElements = state.elements.map((el) => {
          if (el.id === id) {
            return {
              ...el,
              ...updates,
              styles: {
                ...(el.styles || {}),
                ...(updates.styles || {}),
              },
            };
          }
          return el;
        });
        return { elements: nextElements };
      });
    },

    deleteElement: (id) => {
      set((state) => {
        const updated = {
          elements: state.elements.filter((el) => el.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        };
        setTimeout(() => get().captureHistory(), 0);
        return updated;
      });
    },

    duplicateElement: (id) => {
      const source = get().elements.find((el) => el.id === id);
      if (!source) return;

      const dupId = `el_${Date.now()}`;
      const copy: DesignerElement = {
        ...source,
        id: dupId,
        left: `${parseInt(source.left) + 20}px`,
        top: `${parseInt(source.top) + 20}px`,
        styles: { ...(source.styles || {}) }
      };

      set((state) => {
        const updated = {
          elements: [...state.elements, copy],
          selectedId: dupId,
        };
        setTimeout(() => get().captureHistory(), 0);
        return updated;
      });
    },

    selectElement: (id) => set({ selectedId: id }),

    setZoom: (zoom) => set({ zoom }),
    zoomIn: () => set((state) => ({ zoom: Math.min(2.0, state.zoom + 0.1) })),
    zoomOut: () => set((state) => ({ zoom: Math.max(0.3, state.zoom - 0.1) })),
    zoomFit: (w, h) => {
      const { canvasWidth, canvasHeight } = get();
      const margin = 40;
      const fitW = (w - margin) / canvasWidth;
      const fitH = (h - margin) / canvasHeight;
      const zoomVal = Math.min(fitW, fitH, 1.0);
      set({ zoom: zoomVal });
    },

    setCanvasSize: (size) => {
      const dimensions = sizeMap[size];
      if (dimensions) {
        set({
          canvasSize: size,
          canvasWidth: dimensions[0],
          canvasHeight: dimensions[1],
        });
        setTimeout(() => get().captureHistory(), 0);
      }
    },

    setTemplate: (themeName) => {
      const bg = getThemeBg(themeName);
      set({
        currentTemplate: themeName,
        background: bg,
        backgroundImage: '',
      });
      setTimeout(() => get().captureHistory(), 0);
    },

    updateCertSettings: (settings) => {
      set((state) => {
        const nextSettings = { ...state.certSettings, ...settings };
        // Save locally as secondary storage
        localStorage.setItem('cf_certSettings', JSON.stringify(nextSettings));
        return { certSettings: nextSettings };
      });
    },

    captureHistory: () => {
      const currentSnap = serializeState(get() as any);
      set((state) => {
        const stack = state.historyStack.slice(0, state.historyIndex + 1);
        const lastSnap = stack[stack.length - 1];
        if (currentSnap === lastSnap) return {}; // Skip redundant logs
        
        const nextStack = [...stack, currentSnap];
        if (nextStack.length > 50) nextStack.shift();
        
        return {
          historyStack: nextStack,
          historyIndex: nextStack.length - 1,
        };
      });
    },

    undo: () => {
      const { historyIndex, historyStack } = get();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        applySnapshot(historyStack[nextIdx]);
        set({ historyIndex: nextIdx });
      }
    },

    redo: () => {
      const { historyIndex, historyStack } = get();
      if (historyIndex < historyStack.length - 1) {
        const nextIdx = historyIndex + 1;
        applySnapshot(historyStack[nextIdx]);
        set({ historyIndex: nextIdx });
      }
    },

    resetDesigner: () => {
      set({
        elements: defaultElements,
        selectedId: null,
        canvasSize: 'a4-landscape',
        canvasWidth: 842,
        canvasHeight: 595,
        certSettings: defaultCertSettings,
        currentTemplate: 'gold',
        background: 'linear-gradient(135deg, #fdfbf7 0%, #f3e5ab 100%)',
        backgroundImage: '',
      });
      setTimeout(() => get().captureHistory(), 0);
    },

    loadTemplate: (template) => {
      set({
        elements: template.elements,
        background: template.background,
        backgroundImage: template.backgroundImage || '',
        canvasSize: 'a4-landscape', // Standard
        canvasWidth: parseInt(template.width) || 842,
        canvasHeight: parseInt(template.height) || 595,
        selectedId: null,
      });
      setTimeout(() => get().captureHistory(), 0);
    }
  };
});
