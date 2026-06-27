import React, { useEffect, useRef, useState } from 'react';
import { useDesignerStore } from '../store/designerStore';
import { saveTemplate, deleteTemplate, getTemplates, type TemplateData } from '../services/certificates';
import { AuditService } from '../services/audit.service';

// Fonts lists
const fontFamilies = [
  { name: 'Inter (Modern Sans)', value: 'Inter' },
  { name: 'Playfair Display (Elegant Serif)', value: "'Playfair Display', serif" },
  { name: 'Cinzel (Classic Roman)', value: 'Cinzel, serif' },
  { name: 'Great Vibes (Calligraphy)', value: "'Great Vibes', cursive" },
  { name: 'Alex Brush (Cursive)', value: "'Alex Brush', cursive" },
  { name: 'Montserrat (Clean Sans)', value: 'Montserrat, sans-serif' },
  { name: 'Courier Prime (Typewriter)', value: "'Courier Prime', monospace" }
];

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

export default function DesignerPage() {
  const {
    elements,
    selectedId,
    zoom,
    canvasSize,
    canvasWidth,
    canvasHeight,
    certSettings,
    currentTemplate,
    background,
    backgroundImage,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    selectElement,
    zoomIn,
    zoomOut,
    zoomFit,
    setCanvasSize,
    setTemplate,
    updateCertSettings,
    captureHistory,
    undo,
    redo,
    resetDesigner,
    historyStack,
    historyIndex
  } = useDesignerStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputLogoRef = useRef<HTMLInputElement>(null);
  const fileInputBgRef = useRef<HTMLInputElement>(null);

  // Splitter size states (persisted in localStorage)
  const [leftWidth, setLeftWidth] = useState(() => Number(localStorage.getItem('designer_leftWidth')) || 260);
  const [rightWidth, setRightWidth] = useState(() => Number(localStorage.getItem('designer_rightWidth')) || 320);
  const [bottomHeight, setBottomHeight] = useState(() => Number(localStorage.getItem('designer_bottomHeight')) || 180);

  // Collapse states (persisted in localStorage)
  const [leftCollapsed, setLeftCollapsed] = useState(() => localStorage.getItem('designer_leftCollapsed') === 'true');
  const [rightCollapsed, setRightCollapsed] = useState(() => localStorage.getItem('designer_rightCollapsed') === 'true');
  const [bottomCollapsed, setBottomCollapsed] = useState(() => localStorage.getItem('designer_bottomCollapsed') === 'true');

  const [isDragging, setIsDragging] = useState(false);

  // Bottom panel tabs
  const [bottomTab, setBottomTab] = useState<'layers' | 'history' | 'debug'>('layers');
  // Right panel tabs
  const [rightTab, setRightTab] = useState<'properties' | 'document'>('properties');

  // Asset Upload States
  const [logoProgress, setLogoProgress] = useState<number | null>(null);
  const [bgProgress, setBgProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string>('');

  // Snap alignment guides
  const [guideX, setGuideX] = useState<number | null>(null);
  const [guideY, setGuideY] = useState<number | null>(null);

  const selectedEl = elements.find(el => el.id === selectedId);

  // Template Import & Management States
  const [leftTab, setLeftTab] = useState<'build' | 'templates'>('build');
  const fileInputTemplateRef = useRef<HTMLInputElement>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activeTemplateName, setActiveTemplateName] = useState<string>('');
  const [dbTemplates, setDbTemplates] = useState<TemplateData[]>([]);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
  const [isImportingTemplate, setIsImportingTemplate] = useState(false);

  // Load templates from database on mount
  const loadDbTemplatesList = async () => {
    setIsTemplatesLoading(true);
    const list = await getTemplates();
    setDbTemplates(list);
    setIsTemplatesLoading(false);
  };

  useEffect(() => {
    loadDbTemplatesList();
  }, []);

  // Fit zoom on mount or canvas resize
  useEffect(() => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth - 80;
      const h = containerRef.current.clientHeight - 80;
      zoomFit(w, h);
    }
  }, [canvasSize, leftCollapsed, rightCollapsed, bottomCollapsed]);

  // Helper: add custom elements with roles (Placeholders)
  const addDynamicField = (role: string, placeholder: string) => {
    addElement('text', placeholder);
    const addedId = useDesignerStore.getState().selectedId;
    if (addedId) {
      updateElement(addedId, { role, name: role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ') });
      captureHistory();
    }
  };

  // Import template file and fit centered on canvas
  const handleTemplateImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingTemplate(true);
    setUploadError('');

    const handleImageUrl = (url: string) => {
      const img = new Image();
      img.onload = () => {
        const imgWidth = img.width;
        const imgHeight = img.height;
        const imgRatio = imgWidth / imgHeight;
        
        const canvasRatio = canvasWidth / canvasHeight;
        let finalWidth = canvasWidth;
        let finalHeight = canvasHeight;
        
        if (imgRatio > canvasRatio) {
          finalWidth = canvasWidth;
          finalHeight = Math.round(canvasWidth / imgRatio);
        } else {
          finalHeight = canvasHeight;
          finalWidth = Math.round(canvasHeight * imgRatio);
        }
        
        const finalLeft = Math.round((canvasWidth - finalWidth) / 2);
        const finalTop = Math.round((canvasHeight - finalHeight) / 2);

        const uniqueId = `el_bg_${Date.now()}`;
        const bgEl = {
          id: uniqueId,
          type: 'image' as const,
          role: 'template_background',
          name: 'Background Template',
          left: `${finalLeft}px`,
          top: `${finalTop}px`,
          value: url,
          locked: true,
          styles: {
            width: `${finalWidth}px`,
            height: `${finalHeight}px`,
            zIndex: 1,
            opacity: 1
          }
        };

        useDesignerStore.setState((state) => {
          const otherElements = state.elements.filter(el => el.role !== 'template_background');
          return {
            elements: [bgEl, ...otherElements],
            selectedId: uniqueId
          };
        });
        
        captureHistory();
        setIsImportingTemplate(false);
        alert('Template imported successfully as a locked background layer!');
      };
      
      img.onerror = () => {
        setUploadError('Failed to load template image.');
        setIsImportingTemplate(false);
      };
      
      img.src = url;
    };

    if (file.type === 'application/pdf') {
      const fileReader = new FileReader();
      fileReader.onload = async function () {
        try {
          const typedarray = new Uint8Array(this.result as ArrayBuffer);
          const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
          
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          const page = await pdf.getPage(1);
          
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          if (context) {
            const renderContext = {
              canvasContext: context,
              viewport: viewport
            };
            await page.render(renderContext).promise;
            const imageUrl = canvas.toDataURL('image/png');
            handleImageUrl(imageUrl);
          } else {
            throw new Error('Canvas 2D context unavailable');
          }
        } catch (err: any) {
          console.error(err);
          setUploadError(`Failed to process PDF: ${err.message || err}`);
          setIsImportingTemplate(false);
        }
      };
      fileReader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleImageUrl(event.target.result as string);
        } else {
          setUploadError('Failed to read image file.');
          setIsImportingTemplate(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setUploadError('Unsupported file type. Please select PNG, JPG, JPEG or PDF.');
      setIsImportingTemplate(false);
    }
  };

  const handleDuplicateTemplate = async (tpl: TemplateData) => {
    try {
      const newId = `tpl_${Date.now()}`;
      const newName = `${tpl.name} (Copy)`;
      await saveTemplate({
        ...tpl,
        id: newId,
        name: newName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Log TEMPLATE_CREATED event
      AuditService.logEvent({
        action: 'TEMPLATE_CREATED',
        userId: '',
        entityType: 'template',
        entityId: newId,
        metadata: { name: newName, duplicatedFrom: tpl.id }
      });

      alert('Template duplicated successfully!');
      loadDbTemplatesList();
    } catch (e) {
      alert('Failed to duplicate template.');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Are you sure you want to delete this template permanently?')) {
      try {
        await deleteTemplate(id);
        
        if (activeTemplateId === id) {
          setActiveTemplateId(null);
          setActiveTemplateName('');
        }
        alert('Template deleted.');
        loadDbTemplatesList();
      } catch (e) {
        alert('Failed to delete template.');
      }
    }
  };

  const handleLoadTemplate = (tpl: TemplateData) => {
    useDesignerStore.setState({
      elements: tpl.elements,
      background: tpl.background,
      backgroundImage: tpl.backgroundImage || '',
      canvasWidth: parseInt(tpl.width) || 842,
      canvasHeight: parseInt(tpl.height) || 595,
      selectedId: null
    });
    setActiveTemplateId(tpl.id);
    setActiveTemplateName(tpl.name);
    updateCertSettings({ title: tpl.name });
    captureHistory();
  };

  // Persist panel layouts
  useEffect(() => {
    localStorage.setItem('designer_leftWidth', String(leftWidth));
    localStorage.setItem('designer_rightWidth', String(rightWidth));
    localStorage.setItem('designer_bottomHeight', String(bottomHeight));
  }, [leftWidth, rightWidth, bottomHeight]);

  useEffect(() => {
    localStorage.setItem('designer_leftCollapsed', String(leftCollapsed));
    localStorage.setItem('designer_rightCollapsed', String(rightCollapsed));
    localStorage.setItem('designer_bottomCollapsed', String(bottomCollapsed));
  }, [leftCollapsed, rightCollapsed, bottomCollapsed]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Splitter Drag Handlers
  const handleLeftResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const handleMouseMove = (moveEvent: MouseEvent) => {
      setLeftWidth(Math.max(180, Math.min(400, moveEvent.clientX)));
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleRightResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = window.innerWidth - moveEvent.clientX;
      setRightWidth(Math.max(220, Math.min(450, newWidth)));
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleBottomResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newHeight = window.innerHeight - moveEvent.clientY;
      setBottomHeight(Math.max(120, Math.min(400, newHeight)));
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Center Canvas function
  const centerCanvas = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
      container.scrollTop = (container.scrollHeight - container.clientHeight) / 2;
    }
  };

  // Element mouse drag handler with smart snapping guides
  const handleDragStart = (e: React.MouseEvent, elId: string) => {
    const element = elements.find(el => el.id === elId);
    if (!element || element.locked) return; // Skip drag if locked
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
    
    e.preventDefault();
    selectElement(elId);

    const startX = e.clientX;
    const startY = e.clientY;

    const startLeft = parseInt(element.left) || 0;
    const startTop = parseInt(element.top) || 0;

    const elWidth = parseInt(element.styles?.width || '0') || 150;
    const elHeight = parseInt(element.styles?.height || '0') || 40;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;

      let newLeft = startLeft + dx;
      let newTop = startTop + dy;

      // Smart Alignment Snapping to Canvas Center (5px threshold)
      const halfW = elWidth / 2;
      const halfH = elHeight / 2;

      // Horizontal Center Snapping
      if (Math.abs((newLeft + halfW) - canvasWidth / 2) < 5) {
        newLeft = canvasWidth / 2 - halfW;
        setGuideX(canvasWidth / 2);
      } else {
        setGuideX(null);
      }

      // Vertical Center Snapping
      if (Math.abs((newTop + halfH) - canvasHeight / 2) < 5) {
        newTop = canvasHeight / 2 - halfH;
        setGuideY(canvasHeight / 2);
      } else {
        setGuideY(null);
      }

      updateElement(elId, {
        left: `${newLeft}px`,
        top: `${newTop}px`
      });
    };

    const handleMouseUp = () => {
      setGuideX(null);
      setGuideY(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      captureHistory();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Canva-style corner resize handler
  const handleResizeStart = (e: React.MouseEvent, elId: string, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    const element = elements.find(el => el.id === elId);
    if (!element || element.locked) return;

    const startX = e.clientX;
    const startY = e.clientY;
    
    const startWidth = parseInt(element.styles?.width || '150') || 150;
    const startHeight = parseInt(element.styles?.height || '40') || 40;
    const startLeft = parseInt(element.left) || 0;
    const startTop = parseInt(element.top) || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;

      if (corner.includes('e')) {
        newWidth = Math.max(20, startWidth + dx);
      }
      if (corner.includes('s')) {
        newHeight = Math.max(20, startHeight + dy);
      }
      if (corner.includes('w')) {
        const potentialWidth = startWidth - dx;
        if (potentialWidth > 20) {
          newWidth = potentialWidth;
          newLeft = startLeft + dx;
        }
      }
      if (corner.includes('n')) {
        const potentialHeight = startHeight - dy;
        if (potentialHeight > 20) {
          newHeight = potentialHeight;
          newTop = startTop + dy;
        }
      }

      updateElement(elId, {
        left: `${newLeft}px`,
        top: `${newTop}px`,
        styles: {
          ...element.styles,
          width: `${newWidth}px`,
          height: `${newHeight}px`
        }
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      captureHistory();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Keyboard navigation & Nudge support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (!selectedId) return;
      const element = elements.find(el => el.id === selectedId);
      if (!element) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (element.locked) return;
        deleteElement(selectedId);
        captureHistory();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        selectElement(null);
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (element.locked) return;
        e.preventDefault();
        const nudgeAmount = e.shiftKey ? 10 : 1;
        const currentLeft = parseInt(element.left) || 0;
        const currentTop = parseInt(element.top) || 0;
        
        let newLeft = currentLeft;
        let newTop = currentTop;

        if (e.key === 'ArrowLeft') newLeft -= nudgeAmount;
        if (e.key === 'ArrowRight') newLeft += nudgeAmount;
        if (e.key === 'ArrowUp') newTop -= nudgeAmount;
        if (e.key === 'ArrowDown') newTop += nudgeAmount;

        updateElement(selectedId, {
          left: `${newLeft}px`,
          top: `${newTop}px`
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements]);

  // Upload organization background templates
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Stage 1: FILE_SELECTED
    console.log('FILE_SELECTED', { type: 'background', name: file.name, size: file.size });

    const validTypes = ['image/png', 'image/jpg', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Invalid background format. Please select PNG, JPG, or JPEG.');
      return;
    }

    setUploadError('');
    setBgProgress(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        useDesignerStore.setState({ backgroundImage: base64Url });
        captureHistory();
        console.log('BACKGROUND_UPDATED', { type: 'background', url: base64Url });
        setBgProgress(null);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read background image file.');
      setBgProgress(null);
    };
    reader.readAsDataURL(file);
  };

  // Upload element images (logos)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Stage 1: FILE_SELECTED
    console.log('FILE_SELECTED', { type: 'logo', name: file.name, size: file.size });

    const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.svg')) {
      setUploadError('Invalid image format. Supported: PNG, JPG, JPEG, SVG.');
      return;
    }

    setUploadError('');
    setLogoProgress(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        addElement('image', base64Url);
        const addedElementId = useDesignerStore.getState().selectedId;
        console.log('ELEMENT_CREATED', { type: 'logo', elementId: addedElementId, url: base64Url });
        console.log('CANVAS_UPDATED', { type: 'logo' });
        setLogoProgress(null);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
      setLogoProgress(null);
    };
    reader.readAsDataURL(file);
  };

  // Save/Update template in database
  const handleSave = async (overwrite: boolean = false) => {
    const isNew = !(overwrite && activeTemplateId);
    const templateId = overwrite && activeTemplateId ? activeTemplateId : `tpl_${Date.now()}`;
    const templateName = activeTemplateName || certSettings.title || 'Untitled Template';

    try {
      await saveTemplate({
        id: templateId,
        name: templateName,
        elements,
        background,
        backgroundImage,
        width: `${canvasWidth}`,
        height: `${canvasHeight}`,
        colorBg: certSettings.colorBg,
        colorAccent: certSettings.colorAccent,
        colorText: certSettings.colorText,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Log TEMPLATE_CREATED or TEMPLATE_UPDATED event
      AuditService.logEvent({
        action: isNew ? 'TEMPLATE_CREATED' : 'TEMPLATE_UPDATED',
        userId: '',
        entityType: 'template',
        entityId: templateId,
        metadata: { name: templateName }
      });

      setActiveTemplateId(templateId);
      setActiveTemplateName(templateName);
      updateCertSettings({ title: templateName });
      alert(overwrite ? 'Template updated successfully!' : 'Template saved to Firestore database!');
      loadDbTemplatesList();
    } catch (e) {
      alert('Failed to save template.');
    }
  };

  const clearDefaultLayout = () => {
    if (confirm("Remove decoration elements and only keep the dynamic text blocks (Name, Course, QR Code, ID, Date)?")) {
      const coreFields = elements.filter(el => {
        const val = el.value?.toLowerCase() || '';
        const role = el.role?.toLowerCase() || '';
        return role.includes('name') || val.includes('name') || 
               role.includes('course') || val.includes('course') || 
               role.includes('cert-id') || val.includes('id') || 
               val.includes('date') || role.includes('date') ||
               el.type === 'qr';
      });
      useDesignerStore.setState({ elements: coreFields, selectedId: null });
      captureHistory();
    }
  };

  // Layers controls
  const moveLayer = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
    if (targetIdx < 0 || targetIdx >= elements.length) return;
    const nextElements = [...elements];
    const temp = nextElements[idx];
    nextElements[idx] = nextElements[targetIdx];
    nextElements[targetIdx] = temp;
    useDesignerStore.setState({ elements: nextElements });
    captureHistory();
  };

  const jumpToHistory = (idx: number) => {
    try {
      const snap = JSON.parse(historyStack[idx]);
      useDesignerStore.setState({
        elements: snap.elements,
        background: snap.background,
        backgroundImage: snap.backgroundImage,
        canvasSize: snap.canvasSize,
        canvasWidth: snap.canvasWidth,
        canvasHeight: snap.canvasHeight,
        certSettings: snap.certSettings,
        currentTemplate: snap.currentTemplate,
        historyIndex: idx,
        selectedId: null
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-surface-container overflow-hidden text-xs">
      {/* Visual Toolbar */}
      <header className="h-14 bg-white border-b border-outline-variant flex justify-between items-center px-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-container p-1 rounded-lg">
            <button className="px-3 py-1 bg-white shadow-sm rounded text-xs font-bold text-secondary">Designer Workspace</button>
            <button className="px-3 py-1 text-xs text-on-surface-variant hover:text-secondary" onClick={() => selectElement(null)}>Clear Focus</button>
          </div>
          <div className="h-5 w-[1px] bg-outline-variant"></div>
          <span className="text-xs text-on-surface font-semibold">{certSettings.title || 'Untitled Certificate Template'}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Panel toggles */}
          <button 
            onClick={() => setLeftCollapsed(!leftCollapsed)} 
            className={`p-2 hover:bg-surface-container rounded-lg flex items-center ${!leftCollapsed ? 'text-secondary bg-secondary/10' : 'text-on-surface-variant'}`}
            title="Toggle Left Panels (Elements/Assets)"
          >
            <span className="material-symbols-outlined text-[18px]">left_panel_close</span>
          </button>
          <button 
            onClick={() => setBottomCollapsed(!bottomCollapsed)} 
            className={`p-2 hover:bg-surface-container rounded-lg flex items-center ${!bottomCollapsed ? 'text-secondary bg-secondary/10' : 'text-on-surface-variant'}`}
            title="Toggle Bottom Panels (Layers/History)"
          >
            <span className="material-symbols-outlined text-[18px]">bottom_panel_close</span>
          </button>
          <button 
            onClick={() => setRightCollapsed(!rightCollapsed)} 
            className={`p-2 hover:bg-surface-container rounded-lg flex items-center ${!rightCollapsed ? 'text-secondary bg-secondary/10' : 'text-on-surface-variant'}`}
            title="Toggle Right Panels (Properties/Settings)"
          >
            <span className="material-symbols-outlined text-[18px]">right_panel_close</span>
          </button>

          <div className="h-5 w-[1px] bg-outline-variant mx-1"></div>

          <button onClick={undo} disabled={historyIndex <= 0} className="p-2 hover:bg-surface-container rounded-full disabled:opacity-30" title="Undo (Ctrl+Z)">
            <span className="material-symbols-outlined text-[20px]">undo</span>
          </button>
          <button onClick={redo} disabled={historyIndex >= historyStack.length - 1} className="p-2 hover:bg-surface-container rounded-full disabled:opacity-30" title="Redo (Ctrl+Y)">
            <span className="material-symbols-outlined text-[20px]">redo</span>
          </button>
          <button onClick={resetDesigner} className="px-3 py-1.5 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container">
            Reset
          </button>
          {activeTemplateId ? (
            <div className="flex gap-1">
              <button onClick={() => handleSave(true)} className="px-3 py-1.5 bg-secondary hover:opacity-90 active:scale-95 text-white font-bold rounded-l-lg text-xs flex items-center gap-1 border-r border-white/20 shadow-md">
                <span className="material-symbols-outlined text-xs">save</span>
                Save
              </button>
              <button onClick={() => handleSave(false)} className="px-2 py-1.5 bg-secondary hover:opacity-90 active:scale-95 text-white font-bold rounded-r-lg text-xs flex items-center justify-center shadow-md" title="Save As New Template">
                <span className="material-symbols-outlined text-xs font-bold">add_box</span>
              </button>
            </div>
          ) : (
            <button onClick={() => handleSave(false)} className="px-4 py-1.5 bg-secondary hover:opacity-90 active:scale-95 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md">
              <span className="material-symbols-outlined text-xs">save</span>
              Save Template
            </button>
          )}
        </div>
      </header>

      {/* Main Designer Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANEL: Elements & Themes */}
        <aside 
          style={{ 
            width: leftCollapsed ? '0px' : `${leftWidth}px`,
            transition: isDragging ? 'none' : 'width 0.2s ease-in-out'
          }} 
          className="bg-white border-r border-outline-variant flex flex-col shrink-0 overflow-hidden relative"
        >
          {!leftCollapsed && (
            <div className="w-full h-full flex flex-col p-4 gap-4 overflow-y-auto">
              {/* Left Panel Tabs */}
              <div className="flex border border-outline-variant bg-surface-container-low shrink-0 rounded-lg overflow-hidden p-0.5">
                <button
                  onClick={() => setLeftTab('build')}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                    leftTab === 'build' ? 'bg-white text-secondary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high/55'
                  }`}
                >
                  Build Elements
                </button>
                <button
                  onClick={() => setLeftTab('templates')}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                    leftTab === 'templates' ? 'bg-white text-secondary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high/55'
                  }`}
                >
                  Saved Templates
                </button>
              </div>

              {leftTab === 'build' ? (
                <div className="space-y-5">
                  {/* Template Import */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Import Background Template</h3>
                    <input type="file" ref={fileInputTemplateRef} hidden accept=".png,.jpg,.jpeg,.pdf" onChange={handleTemplateImport} />
                    <button 
                      onClick={() => fileInputTemplateRef.current?.click()}
                      disabled={isImportingTemplate}
                      className="w-full border-2 border-dashed border-secondary/40 bg-secondary/5 rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-secondary hover:bg-secondary/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg text-secondary">cloud_upload</span>
                      <span className="text-[10px] font-bold mt-1 text-secondary">Import Template (PNG, JPG, PDF)</span>
                      {isImportingTemplate && (
                        <span className="text-[9px] text-on-surface-variant mt-1 animate-pulse">Processing...</span>
                      )}
                    </button>
                  </div>

                  <div className="h-[1px] bg-outline-variant"></div>

                  {/* Add Elements */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Add Elements</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => addElement('text', 'New Text')} className="flex flex-col items-center justify-center gap-1 p-2 border border-outline-variant rounded-lg hover:border-secondary hover:bg-surface-container-low transition-all">
                        <span className="material-symbols-outlined text-base">text_fields</span>
                        <span className="text-[9px]">Text</span>
                      </button>
                      <button onClick={() => addElement('qr')} className="flex flex-col items-center justify-center gap-1 p-2 border border-outline-variant rounded-lg hover:border-secondary hover:bg-surface-container-low transition-all">
                        <span className="material-symbols-outlined text-base">qr_code</span>
                        <span className="text-[9px]">QR Code</span>
                      </button>
                      <button onClick={() => addElement('seal')} className="flex flex-col items-center justify-center gap-1 p-2 border border-outline-variant rounded-lg hover:border-secondary hover:bg-surface-container-low transition-all">
                        <span className="material-symbols-outlined text-base">verified</span>
                        <span className="text-[9px]">Seal</span>
                      </button>
                      <button onClick={() => addElement('border')} className="flex flex-col items-center justify-center gap-1 p-2 border border-outline-variant rounded-lg hover:border-secondary hover:bg-surface-container-low transition-all">
                        <span className="material-symbols-outlined text-base">crop_square</span>
                        <span className="text-[9px]">Border</span>
                      </button>
                      <button onClick={() => addElement('divider')} className="flex flex-col items-center justify-center gap-1 p-2 border border-outline-variant rounded-lg hover:border-secondary hover:bg-surface-container-low transition-all">
                        <span className="material-symbols-outlined text-base">horizontal_rule</span>
                        <span className="text-[9px]">Divider</span>
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-outline-variant"></div>

                  {/* Dynamic Field Placeholders */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Dynamic Fields</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => addDynamicField('recipient_name', '{{name}}')} className="flex items-center gap-2 p-2 border border-outline-variant rounded-lg hover:border-secondary hover:bg-surface-container-low text-left font-semibold text-on-surface">
                        <span className="material-symbols-outlined text-sm text-secondary">person</span>
                        <span className="text-[10px]">Name Placeholder</span>
                      </button>
                      <button onClick={() => addDynamicField('course_title', '{{course}}')} className="flex items-center gap-2 p-2 border border-outline-variant rounded-lg hover:border-secondary hover:bg-surface-container-low text-left font-semibold text-on-surface">
                        <span className="material-symbols-outlined text-sm text-secondary">school</span>
                        <span className="text-[10px]">Course Placeholder</span>
                      </button>
                      <button onClick={() => addDynamicField('date', '{{date}}')} className="flex items-center gap-2 p-2 border border-outline-variant rounded-lg hover:border-secondary hover:bg-surface-container-low text-left font-semibold text-on-surface">
                        <span className="material-symbols-outlined text-sm text-secondary">calendar_today</span>
                        <span className="text-[10px]">Date Placeholder</span>
                      </button>
                      <button onClick={() => addDynamicField('cert-id', '{{certificate_id}}')} className="flex items-center gap-2 p-2 border border-outline-variant rounded-lg hover:border-secondary hover:bg-surface-container-low text-left font-semibold text-on-surface">
                        <span className="material-symbols-outlined text-sm text-secondary">fingerprint</span>
                        <span className="text-[10px]">ID Placeholder</span>
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-outline-variant"></div>

                  {/* Custom Assets */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Custom Assets</h3>
                    <div className="space-y-2">
                      <input type="file" ref={fileInputLogoRef} hidden accept=".png,.jpg,.jpeg,.svg" onChange={handleImageUpload} />
                      <input type="file" ref={fileInputBgRef} hidden accept=".png,.jpg,.jpeg" onChange={handleBgUpload} />

                      <button 
                        onClick={() => fileInputLogoRef.current?.click()}
                        disabled={logoProgress !== null}
                        className="w-full border-2 border-dashed border-outline-variant bg-surface-container-low rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-secondary hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg text-secondary">image</span>
                        <span className="text-[10px] font-bold mt-1 text-on-surface">Upload Logo/Asset</span>
                        {logoProgress !== null && (
                          <div className="w-full bg-surface-container mt-2 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-secondary h-full" style={{ width: `${logoProgress}%` }} />
                          </div>
                        )}
                      </button>

                      <button 
                        onClick={() => fileInputBgRef.current?.click()}
                        disabled={bgProgress !== null}
                        className="w-full border-2 border-dashed border-outline-variant bg-surface-container-low rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-secondary hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg text-secondary">palette</span>
                        <span className="text-[10px] font-bold mt-1 text-on-surface">Upload Background</span>
                        {bgProgress !== null && (
                          <div className="w-full bg-surface-container mt-2 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-secondary h-full" style={{ width: `${bgProgress}%` }} />
                          </div>
                        )}
                      </button>

                      {backgroundImage && (
                        <button 
                          onClick={() => { useDesignerStore.setState({ backgroundImage: '' }); captureHistory(); }}
                          className="w-full py-1.5 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-bold flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">no_photography</span>
                          Remove Background
                        </button>
                      )}

                      {uploadError && (
                        <p className="text-[10px] text-red-500 bg-red-50 p-2 rounded-lg border border-red-200">{uploadError}</p>
                      )}

                      <button onClick={clearDefaultLayout} className="w-full text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 py-1.5 border border-red-200 rounded-lg">
                        Clear Layout Clutter
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-outline-variant"></div>

                  {/* Built-in Themes */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Built-in Themes</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {['gold', 'violet', 'teal', 'ember', 'light', 'forest'].map(theme => (
                        <button
                          key={theme}
                          onClick={() => setTemplate(theme)}
                          className={`h-9 rounded-lg border text-[10px] font-bold transition-all relative overflow-hidden capitalize ${
                            currentTemplate === theme ? 'border-secondary ring-2 ring-secondary/20 font-extrabold' : 'border-outline-variant'
                          }`}
                          style={{
                            background: theme === 'light' ? '#fff' : getThemeBg(theme),
                            color: theme === 'light' ? '#000' : '#45464d'
                          }}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Template Info Panel */}
                  <div className="p-3 bg-secondary/5 rounded-xl border border-secondary/15 space-y-3">
                    <h4 className="font-bold text-[10px] text-secondary uppercase tracking-wider">Active Workspace Template</h4>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] text-on-surface-variant font-semibold uppercase">Template Name</label>
                      <input
                        type="text"
                        value={activeTemplateName}
                        onChange={(e) => {
                          setActiveTemplateName(e.target.value);
                          updateCertSettings({ title: e.target.value });
                        }}
                        className="w-full border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:ring-1 focus:ring-secondary focus:border-secondary"
                        placeholder="Untitled Template"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleSave(true)}
                        disabled={!activeTemplateId}
                        className="flex-1 py-1.5 bg-secondary text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 transition-all shadow disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <span className="material-symbols-outlined text-xs">save</span>
                        Save Changes
                      </button>
                      <button 
                        onClick={() => handleSave(false)}
                        className="flex-1 py-1.5 border border-outline rounded-lg font-bold text-[10px] hover:bg-surface-container flex items-center justify-center gap-1 transition-all"
                      >
                        <span className="material-symbols-outlined text-xs">add_box</span>
                        Save As New
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-outline-variant"></div>

                  {/* Saved Templates List */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Firestore Templates</h3>
                    {isTemplatesLoading ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2 text-on-surface-variant">
                        <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px]">Loading templates...</span>
                      </div>
                    ) : dbTemplates.length === 0 ? (
                      <p className="text-on-surface-variant opacity-60 text-center py-8">No saved templates found.</p>
                    ) : (
                      <div className="space-y-2">
                        {dbTemplates.map(tpl => {
                          const isActive = tpl.id === activeTemplateId;
                          return (
                            <div 
                              key={tpl.id}
                              className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all ${
                                isActive ? 'border-secondary bg-secondary/5' : 'border-outline-variant bg-surface-container-low/20'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-on-surface text-xs leading-tight truncate w-36">{tpl.name}</p>
                                  <p className="text-[9px] text-on-surface-variant/80 mt-0.5">{tpl.elements?.length || 0} layers · {tpl.width}x{tpl.height}</p>
                                </div>
                                {isActive && (
                                  <span className="bg-secondary/15 text-secondary border border-secondary/20 px-1.5 py-0.5 rounded text-[8px] uppercase font-extrabold font-mono leading-none">Active</span>
                                )}
                              </div>

                              <div className="flex justify-end gap-1.5 border-t border-outline-variant/30 pt-1.5">
                                <button
                                  onClick={() => handleLoadTemplate(tpl)}
                                  className="px-2 py-1 bg-surface-container text-on-surface font-semibold rounded text-[9px] hover:bg-surface-container-high flex items-center gap-1 transition-all"
                                  title="Load Template"
                                >
                                  <span className="material-symbols-outlined text-xs">folder_open</span>
                                  Open
                                </button>
                                <button
                                  onClick={() => handleDuplicateTemplate(tpl)}
                                  className="px-2 py-1 bg-surface-container text-on-surface font-semibold rounded text-[9px] hover:bg-surface-container-high flex items-center gap-1 transition-all"
                                  title="Duplicate Template"
                                >
                                  <span className="material-symbols-outlined text-xs">content_copy</span>
                                  Clone
                                </button>
                                <button
                                  onClick={() => handleDeleteTemplate(tpl.id)}
                                  className="px-2 py-1 bg-red-50 text-red-600 font-semibold rounded text-[9px] hover:bg-red-100 flex items-center gap-1 transition-all border border-red-200/50"
                                  title="Delete Template"
                                >
                                  <span className="material-symbols-outlined text-xs">delete</span>
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Left Splitter */}
        {!leftCollapsed && (
          <div 
            onMouseDown={handleLeftResize} 
            className="w-1.5 hover:w-2 bg-transparent hover:bg-secondary/20 cursor-col-resize shrink-0 z-20 transition-colors"
          />
        )}

        {/* CENTER & BOTTOM PANELS */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* CENTER PANEL: Canvas Editor */}
          <section 
            ref={containerRef} 
            className="flex-1 bg-surface-container p-6 overflow-auto flex justify-center items-center canvas-grid relative select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) selectElement(null);
            }}
          >
            {/* Certificate Render Canvas */}
            <div
              id="certificate-canvas"
              className="bg-white shadow-2xl relative border border-outline-variant shrink-0"
              style={{
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
                background: backgroundImage ? `url(${backgroundImage})` : background,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: `scale(${zoom})`,
                transformOrigin: 'center'
              }}
            >
              {/* Snap Alignment Guides */}
              {guideX !== null && (
                <div 
                  className="absolute border-l border-dashed border-secondary pointer-events-none z-50 animate-pulse"
                  style={{
                    left: `${guideX}px`,
                    top: 0,
                    bottom: 0,
                    height: '100%'
                  }}
                />
              )}
              {guideY !== null && (
                <div 
                  className="absolute border-t border-dashed border-secondary pointer-events-none z-50 animate-pulse"
                  style={{
                    top: `${guideY}px`,
                    left: 0,
                    right: 0,
                    width: '100%'
                  }}
                />
              )}

              {/* Floating Context Toolbar */}
              {selectedId && (() => {
                const el = elements.find(e => e.id === selectedId);
                if (!el) return null;
                
                const leftVal = parseInt(el.left) || 0;
                const topVal = parseInt(el.top) || 0;
                const elWidth = parseInt(el.styles?.width || '150') || 150;
                
                // Position it 45px above the element
                const toolbarTop = Math.max(-40, topVal - 45);
                const toolbarLeft = leftVal + (elWidth / 2);

                return (
                  <div 
                    className="absolute bg-white shadow-xl border border-outline-variant rounded-full px-2.5 py-1 flex items-center gap-1 z-[100] -translate-x-1/2 select-none transition-all"
                    style={{ 
                      top: `${toolbarTop}px`, 
                      left: `${toolbarLeft}px` 
                    }}
                    onMouseDown={(e) => e.stopPropagation()} // Prevent canvas dragging
                  >
                    <button 
                      onClick={() => {
                        updateElement(el.id, { locked: !el.locked });
                        captureHistory();
                      }}
                      className={`p-1 hover:bg-surface-container rounded-full text-xs flex items-center justify-center ${el.locked ? 'text-red-500 bg-red-50' : 'text-on-surface-variant'}`}
                      title={el.locked ? 'Unlock element' : 'Lock element'}
                    >
                      <span className="material-symbols-outlined text-[15px]">{el.locked ? 'lock' : 'lock_open'}</span>
                    </button>

                    <div className="w-px h-3.5 bg-outline-variant" />

                    {/* Move up / Move down in z-index */}
                    <button 
                      onClick={() => {
                        const curZ = el.styles?.zIndex || 10;
                        updateElement(el.id, { styles: { ...el.styles, zIndex: Math.max(1, curZ - 1) } });
                        captureHistory();
                      }}
                      disabled={el.locked}
                      className="p-1 hover:bg-surface-container rounded-full text-on-surface-variant text-xs flex items-center justify-center disabled:opacity-30"
                      title="Send backward"
                    >
                      <span className="material-symbols-outlined text-[15px]">flip_to_back</span>
                    </button>
                    <button 
                      onClick={() => {
                        const curZ = el.styles?.zIndex || 10;
                        updateElement(el.id, { styles: { ...el.styles, zIndex: curZ + 1 } });
                        captureHistory();
                      }}
                      disabled={el.locked}
                      className="p-1 hover:bg-surface-container rounded-full text-on-surface-variant text-xs flex items-center justify-center disabled:opacity-30"
                      title="Bring forward"
                    >
                      <span className="material-symbols-outlined text-[15px]">flip_to_front</span>
                    </button>

                    <div className="w-px h-3.5 bg-outline-variant" />

                    {/* Duplicate */}
                    <button 
                      onClick={() => {
                        if (el.locked) return;
                        // Add new duplicated element
                        const newId = `el_${Date.now()}`;
                        const dup = {
                          ...el,
                          id: newId,
                          left: `${leftVal + 20}px`,
                          top: `${topVal + 20}px`,
                          locked: false
                        };
                        useDesignerStore.setState({
                          elements: [...elements, dup],
                          selectedId: newId
                        });
                        captureHistory();
                      }}
                      disabled={el.locked}
                      className="p-1 hover:bg-surface-container rounded-full text-on-surface-variant text-xs flex items-center justify-center disabled:opacity-30"
                      title="Duplicate element"
                    >
                      <span className="material-symbols-outlined text-[15px]">content_copy</span>
                    </button>

                    <div className="w-px h-3.5 bg-outline-variant" />

                    {/* Delete */}
                    <button 
                      onClick={() => {
                        if (el.locked) return;
                        deleteElement(el.id);
                        captureHistory();
                      }}
                      disabled={el.locked}
                      className="p-1 hover:bg-red-50 hover:text-red-500 rounded-full text-on-surface-variant text-xs flex items-center justify-center disabled:opacity-30"
                      title="Delete element"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                );
              })()}

              {elements.map((el) => {
                if (el.hidden) return null;
                const isSelected = el.id === selectedId;
                const isLocked = el.locked;
                const borderClass = isSelected 
                  ? (isLocked ? 'ring-2 ring-red-500' : 'ring-2 ring-secondary') 
                  : 'hover:ring-1 hover:ring-secondary/50';

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleDragStart(e, el.id)}
                    className={`absolute ${borderClass}`}
                    style={{
                      left: el.left,
                      top: el.top,
                      width: el.styles?.width || 'auto',
                      height: el.styles?.height || 'auto',
                      zIndex: el.styles?.zIndex || 10,
                      cursor: isLocked ? 'not-allowed' : 'move',
                      padding: '2px'
                    }}
                  >
                    {isSelected && isLocked && (
                      <div className="absolute -top-2.5 -right-2.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md z-30">
                        <span className="material-symbols-outlined text-[10px] font-bold">lock</span>
                      </div>
                    )}

                    {isSelected && !isLocked && (
                      <>
                        {/* Corner Resize Handles */}
                        <div 
                          className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-secondary rounded-full cursor-nwse-resize z-40 hover:scale-125 transition-transform" 
                          onMouseDown={(e) => handleResizeStart(e, el.id, 'nw')}
                        />
                        <div 
                          className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-secondary rounded-full cursor-nesw-resize z-40 hover:scale-125 transition-transform" 
                          onMouseDown={(e) => handleResizeStart(e, el.id, 'ne')}
                        />
                        <div 
                          className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-secondary rounded-full cursor-nesw-resize z-40 hover:scale-125 transition-transform" 
                          onMouseDown={(e) => handleResizeStart(e, el.id, 'sw')}
                        />
                        <div 
                          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-secondary rounded-full cursor-nwse-resize z-40 hover:scale-125 transition-transform" 
                          onMouseDown={(e) => handleResizeStart(e, el.id, 'se')}
                        />
                      </>
                    )}

                    {el.type === 'text' && (
                      <textarea
                        value={el.value || ''}
                        onChange={(e) => updateElement(el.id, { value: e.target.value })}
                        disabled={isLocked}
                        style={{
                          fontSize: el.styles?.fontSize || '14px',
                          fontWeight: el.styles?.fontWeight || '400',
                          fontStyle: el.styles?.fontStyle || 'normal',
                          color: el.styles?.color || '#000000',
                          textAlign: el.styles?.textAlign || 'left',
                          fontFamily: el.styles?.fontFamily || 'Inter',
                          lineHeight: el.styles?.lineHeight || 1.2,
                          letterSpacing: el.styles?.letterSpacing || 'normal',
                          background: 'transparent',
                          border: 'none',
                          width: '100%',
                          resize: 'none',
                          outline: 'none',
                          overflow: 'hidden'
                        }}
                        rows={1}
                      />
                    )}
                    {el.type === 'qr' && (
                      <div className="bg-[#cbd5e1]/30 flex items-center justify-center text-xs font-semibold text-on-surface-variant border border-outline-variant" style={{ width: el.styles?.width || '100px', height: el.styles?.height || '100px' }}>
                        <span className="material-symbols-outlined text-3xl">qr_code_2</span>
                      </div>
                    )}
                    {el.type === 'divider' && (
                      <div style={{ width: el.styles?.width || '150px', height: el.styles?.height || '2px', background: el.styles?.color || '#d4af37' }} />
                    )}
                    {el.type === 'seal' && (
                      <div className="flex items-center justify-center text-center font-bold text-[#d4af37] text-[9px]" style={{ width: el.styles?.width || '80px', height: el.styles?.height || '80px', borderRadius: '50%', border: el.styles?.border || '3px double #d4af37' }}>
                        OFFICIAL<br />SEAL
                      </div>
                    )}
                    {el.type === 'border' && (
                      <div className="pointer-events-none" style={{ width: '100%', height: '100%', border: el.styles?.border || '4px double #d4af37' }} />
                    )}
                    {el.type === 'image' && (
                      <img 
                        src={el.value} 
                        className="pointer-events-none object-contain" 
                        style={{ 
                          width: '100%', 
                          height: '100%',
                          opacity: el.styles?.opacity !== undefined ? el.styles.opacity : 1,
                          borderRadius: el.styles?.borderRadius || '0px'
                        }} 
                        alt="asset" 
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom Bottom Floating Zoom & Canvas Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur shadow-lg border border-outline-variant px-3 py-1.5 rounded-full flex items-center gap-3 z-10 select-none">
              <button onClick={zoomOut} className="p-1 hover:bg-surface-container rounded-full text-on-surface" title="Zoom Out">
                <span className="material-symbols-outlined text-base font-bold">remove</span>
              </button>
              <span className="text-xs font-semibold text-on-surface w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={zoomIn} className="p-1 hover:bg-surface-container rounded-full text-on-surface" title="Zoom In">
                <span className="material-symbols-outlined text-base font-bold">add</span>
              </button>
              <div className="h-4 w-px bg-outline-variant" />
              <button onClick={() => useDesignerStore.setState({ zoom: 1.0 })} className="px-2 py-0.5 hover:bg-surface-container rounded text-[10px] font-bold text-on-surface" title="Set zoom to 100%">
                100%
              </button>
              <button 
                onClick={() => {
                  if (containerRef.current) {
                    const w = containerRef.current.clientWidth - 80;
                    const h = containerRef.current.clientHeight - 80;
                    zoomFit(w, h);
                  }
                }} 
                className="p-1 hover:bg-surface-container rounded-full text-on-surface" 
                title="Fit Canvas to screen"
              >
                <span className="material-symbols-outlined text-base font-bold">fit_screen</span>
              </button>
              <button onClick={centerCanvas} className="p-1 hover:bg-surface-container rounded-full text-on-surface" title="Center Canvas Viewport">
                <span className="material-symbols-outlined text-base font-bold">center_focus_strong</span>
              </button>
            </div>
          </section>

          {/* Bottom Splitter */}
          {!bottomCollapsed && (
            <div 
              onMouseDown={handleBottomResize} 
              className="h-1.5 hover:h-2 bg-transparent hover:bg-secondary/20 cursor-row-resize shrink-0 z-20 transition-colors"
            />
          )}

          {/* BOTTOM PANEL: Layers, History, Debug info */}
          <div 
            style={{ 
              height: bottomCollapsed ? '0px' : `${bottomHeight}px`,
              transition: isDragging ? 'none' : 'height 0.2s ease-in-out'
            }} 
            className="bg-white border-t border-outline-variant flex flex-col shrink-0 overflow-hidden relative"
          >
            {!bottomCollapsed && (
              <div className="w-full h-full flex flex-col overflow-hidden">
                {/* Tabs Header */}
                <div className="flex bg-surface-container-low border-b border-outline-variant shrink-0">
                  {[
                    { id: 'layers', label: 'Layer Manager', icon: 'layers' },
                    { id: 'history', label: 'History Stack', icon: 'history' },
                    { id: 'debug', label: 'Debug Console', icon: 'terminal' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setBottomTab(tab.id as any)}
                      className={`px-4 py-2 border-r border-outline-variant text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                        bottomTab === tab.id ? 'bg-white text-secondary' : 'text-on-surface-variant hover:bg-surface-container-high/55'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                  <button 
                    onClick={() => setBottomCollapsed(true)} 
                    className="ml-auto p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded-full m-0.5"
                    title="Collapse Panel"
                  >
                    <span className="material-symbols-outlined text-sm">keyboard_double_arrow_down</span>
                  </button>
                </div>

                {/* Tab content area */}
                <div className="flex-1 p-3 overflow-y-auto bg-white">
                  {bottomTab === 'layers' && (
                    <div className="space-y-1.5">
                      {elements.length === 0 ? (
                        <p className="text-on-surface-variant opacity-60 text-center py-4">No layers created yet. Add components from the left menu.</p>
                      ) : (
                        elements.slice().reverse().map((el, revIdx) => {
                          const originalIdx = elements.length - 1 - revIdx;
                          const isSelected = el.id === selectedId;
                            const getElementLayerGroup = (item: typeof el): 'Background Layer' | 'Dynamic Fields' | 'Branding Layer' => {
                              const role = item.role?.toLowerCase() || '';
                              const val = item.value?.toLowerCase() || '';
                              if (role === 'template_background' || item.type === 'border') {
                                return 'Background Layer';
                              }
                              if (
                                role.includes('name') || val.includes('{{name}}') ||
                                role.includes('course') || val.includes('{{course}}') ||
                                role.includes('date') || val.includes('{{date}}') ||
                                role.includes('id') || val.includes('{{certificate_id}}') ||
                                item.type === 'qr'
                              ) {
                                return 'Dynamic Fields';
                              }
                              return 'Branding Layer';
                            };
                            const groupName = getElementLayerGroup(el);

                            return (
                              <div 
                                key={el.id}
                                onClick={() => selectElement(el.id)}
                                className={`flex items-center gap-3 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                                  isSelected ? 'border-secondary bg-secondary/5 font-semibold text-secondary' : 'border-outline-variant hover:bg-surface-container-low'
                                }`}
                              >
                                {/* Element Type Icon */}
                                <span className="material-symbols-outlined text-base">
                                  {el.type === 'text' ? 'text_fields' : 
                                   el.type === 'image' ? 'image' : 
                                   el.type === 'qr' ? 'qr_code' : 
                                   el.type === 'seal' ? 'verified' : 
                                   el.type === 'border' ? 'crop_square' : 'horizontal_rule'}
                                </span>

                                {/* Layer Category Badge */}
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border leading-none shrink-0 ${
                                  groupName === 'Background Layer' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                  groupName === 'Dynamic Fields' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {groupName === 'Background Layer' ? 'BG' : groupName === 'Dynamic Fields' ? 'Field' : 'Brand'}
                                </span>
                              
                              {/* Renaming Input */}
                              <input 
                                type="text" 
                                value={el.name || el.role || el.value || el.type}
                                onChange={(e) => updateElement(el.id, { name: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-transparent border-b border-transparent hover:border-outline-variant focus:border-secondary outline-none px-1 py-0.5 text-xs font-medium w-48 truncate"
                              />

                              <span className="text-[10px] text-outline ml-2">({el.type})</span>

                              {/* Controls (Visibility, Lock, Reorder) */}
                              <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={() => updateElement(el.id, { hidden: !el.hidden })}
                                  className={`p-1 hover:bg-surface-container rounded ${el.hidden ? 'text-outline' : 'text-secondary'}`}
                                  title={el.hidden ? "Show layer on canvas" : "Hide layer"}
                                >
                                  <span className="material-symbols-outlined text-sm">{el.hidden ? 'visibility_off' : 'visibility'}</span>
                                </button>
                                <button 
                                  onClick={() => updateElement(el.id, { locked: !el.locked })}
                                  className={`p-1 hover:bg-surface-container rounded ${el.locked ? 'text-red-500' : 'text-outline'}`}
                                  title={el.locked ? "Unlock element positions" : "Lock element positions"}
                                >
                                  <span className="material-symbols-outlined text-sm">{el.locked ? 'lock' : 'lock_open'}</span>
                                </button>

                                <div className="h-4 w-[1px] bg-outline-variant mx-1" />

                                <button 
                                  disabled={originalIdx === elements.length - 1}
                                  onClick={() => moveLayer(originalIdx, 'up')}
                                  className="p-1 hover:bg-surface-container rounded disabled:opacity-30"
                                  title="Bring forward in stack"
                                >
                                  <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                </button>
                                <button 
                                  disabled={originalIdx === 0}
                                  onClick={() => moveLayer(originalIdx, 'down')}
                                  className="p-1 hover:bg-surface-container rounded disabled:opacity-30"
                                  title="Send backward in stack"
                                >
                                  <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {bottomTab === 'history' && (
                    <div className="space-y-1">
                      {historyStack.map((snap, idx) => {
                        const isCurrent = idx === historyIndex;
                        let label = `Snapshot State #${idx + 1}`;
                        try {
                          const parsed = JSON.parse(snap);
                          const elCount = parsed.elements?.length || 0;
                          label = `Action State #${idx + 1} (${elCount} elements, size: ${parsed.canvasSize})`;
                        } catch(e){}

                        return (
                          <div 
                            key={idx}
                            onClick={() => jumpToHistory(idx)}
                            className={`flex justify-between items-center px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                              isCurrent ? 'border-secondary bg-secondary/5 font-semibold text-secondary' : 'border-outline-variant hover:bg-surface-container-low'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-secondary' : 'bg-outline-variant'}`} />
                              {label}
                            </span>
                            <span className="text-[10px] text-outline">{isCurrent ? 'Current' : 'Click to restore'}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {bottomTab === 'debug' && (
                    <div className="grid grid-cols-3 gap-4 text-[11px] font-mono text-on-surface-variant p-2">
                      <div className="space-y-1">
                        <p className="font-bold border-b pb-0.5">Canvas Bounds</p>
                        <p>Standard Size: {canvasSize}</p>
                        <p>Actual Width: {canvasWidth}px</p>
                        <p>Actual Height: {canvasHeight}px</p>
                        <p>Current Zoom: {Math.round(zoom * 100)}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold border-b pb-0.5">Element Stack</p>
                        <p>Total layers: {elements.length}</p>
                        <p>Selected ID: {selectedId || 'None'}</p>
                        <p>Locked count: {elements.filter(e => e.locked).length}</p>
                        <p>Hidden count: {elements.filter(e => e.hidden).length}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold border-b pb-0.5">Template Settings</p>
                        <p>Template: {currentTemplate}</p>
                        <p>Custom background: {backgroundImage ? 'Yes' : 'No'}</p>
                        <p>Org: {certSettings.org}</p>
                        <p>Title: {certSettings.title}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Splitter */}
        {!rightCollapsed && (
          <div 
            onMouseDown={handleRightResize} 
            className="w-1.5 hover:w-2 bg-transparent hover:bg-secondary/20 cursor-col-resize shrink-0 z-20 transition-colors"
          />
        )}

        {/* RIGHT PANEL: Settings & Properties */}
        <aside 
          style={{ 
            width: rightCollapsed ? '0px' : `${rightWidth}px`,
            transition: isDragging ? 'none' : 'width 0.2s ease-in-out'
          }}
          className="bg-white border-l border-outline-variant flex flex-col shrink-0 overflow-hidden relative"
        >
          {!rightCollapsed && (
            <div className="w-full h-full flex flex-col overflow-hidden">
              {/* Tab Header */}
              <div className="flex border-b border-outline-variant bg-surface-container-low shrink-0">
                <button
                  onClick={() => setRightTab('properties')}
                  className={`flex-1 py-3 text-xs font-bold capitalize transition-colors ${
                    rightTab === 'properties' ? 'text-secondary border-b-2 border-secondary bg-white' : 'text-on-surface-variant hover:bg-surface-container-high/55'
                  }`}
                >
                  Properties
                </button>
                <button
                  onClick={() => setRightTab('document')}
                  className={`flex-1 py-3 text-xs font-bold capitalize transition-colors ${
                    rightTab === 'document' ? 'text-secondary border-b-2 border-secondary bg-white' : 'text-on-surface-variant hover:bg-surface-container-high/55'
                  }`}
                >
                  Document Settings
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-4 overflow-y-auto space-y-5">
                {rightTab === 'properties' && (
                  selectedEl ? (
                    <div className="space-y-4">
                      {/* Selected Element Overview */}
                      <div className="p-3 bg-secondary/5 rounded-lg border border-secondary/20">
                        <p className="text-[11px] font-bold text-secondary uppercase flex justify-between items-center">
                          <span>Editing: {selectedEl.type}</span>
                          <span className="text-[9px] lowercase bg-secondary/15 px-1.5 py-0.5 rounded">ID: {selectedEl.id.slice(0, 8)}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <label className="text-[9px] text-on-surface-variant font-semibold">Rename Layer:</label>
                          <input
                            type="text"
                            value={selectedEl.name || selectedEl.role || selectedEl.type}
                            onChange={(e) => updateElement(selectedEl.id, { name: e.target.value })}
                            className="flex-1 border border-outline-variant/60 rounded px-1.5 py-0.5 text-xs outline-none bg-surface-container-low"
                          />
                        </div>
                      </div>

                      {/* Common: Position Settings */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Left (X pos)</label>
                          <input
                            type="number"
                            value={parseInt(selectedEl.left) || 0}
                            onChange={(e) => updateElement(selectedEl.id, { left: `${e.target.value}px` })}
                            className="w-full mt-1 border border-outline-variant rounded-lg p-2 text-xs outline-none bg-surface-container-low focus:ring-1 focus:ring-secondary focus:border-secondary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Top (Y pos)</label>
                          <input
                            type="number"
                            value={parseInt(selectedEl.top) || 0}
                            onChange={(e) => updateElement(selectedEl.id, { top: `${e.target.value}px` })}
                            className="w-full mt-1 border border-outline-variant rounded-lg p-2 text-xs outline-none bg-surface-container-low focus:ring-1 focus:ring-secondary focus:border-secondary"
                          />
                        </div>
                      </div>

                      {/* Text-specific styles */}
                      {selectedEl.type === 'text' && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Font Family</label>
                            <select
                              value={selectedEl.styles?.fontFamily || 'Inter'}
                              onChange={(e) => updateElement(selectedEl.id, { styles: { fontFamily: e.target.value } })}
                              className="w-full mt-1 border border-outline-variant rounded-lg p-2 text-xs outline-none bg-surface-container-low"
                            >
                              {fontFamilies.map(f => (
                                <option key={f.value} value={f.value}>{f.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Font Size (px)</label>
                              <input
                                type="number"
                                value={parseInt(selectedEl.styles?.fontSize || '14') || 14}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { fontSize: `${e.target.value}px` } })}
                                className="w-full mt-1 border border-outline-variant rounded-lg p-2 text-xs outline-none bg-surface-container-low focus:ring-1 focus:ring-secondary focus:border-secondary"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Font Weight</label>
                              <select
                                value={selectedEl.styles?.fontWeight || '400'}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { fontWeight: e.target.value } })}
                                className="w-full mt-1 border border-outline-variant rounded-lg p-2 text-xs outline-none bg-surface-container-low"
                              >
                                <option value="400">Normal</option>
                                <option value="500">Medium</option>
                                <option value="600">Semibold</option>
                                <option value="700">Bold</option>
                                <option value="800">Extra Bold</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Text Align</label>
                              <select
                                value={selectedEl.styles?.textAlign || 'left'}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { textAlign: e.target.value as any } })}
                                className="w-full mt-1 border border-outline-variant rounded-lg p-2 text-xs outline-none bg-surface-container-low"
                              >
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Color</label>
                              <input
                                type="color"
                                value={selectedEl.styles?.color || '#000000'}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { color: e.target.value } })}
                                className="w-full mt-1 h-8 rounded-lg cursor-pointer border p-0.5 bg-surface-container-low border-outline-variant"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Width (px)</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="range"
                                min="100"
                                max="800"
                                value={parseInt(selectedEl.styles?.width || '300') || 300}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { width: `${e.target.value}px` } })}
                                className="flex-1 accent-secondary"
                              />
                              <input
                                type="number"
                                value={parseInt(selectedEl.styles?.width || '300') || 300}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { width: `${e.target.value}px` } })}
                                className="w-16 border border-outline-variant rounded p-1 text-xs outline-none bg-surface-container-low"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Image properties */}
                      {selectedEl.type === 'image' && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Image Width (px)</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="range"
                                min="10"
                                max="1000"
                                value={parseInt(selectedEl.styles?.width || '100') || 100}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { width: `${e.target.value}px` } })}
                                className="flex-1 accent-secondary"
                              />
                              <input
                                type="number"
                                value={parseInt(selectedEl.styles?.width || '100') || 100}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { width: `${e.target.value}px` } })}
                                className="w-16 border border-outline-variant rounded p-1 text-xs outline-none bg-surface-container-low"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Image Height (px)</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="range"
                                min="10"
                                max="1000"
                                value={parseInt(selectedEl.styles?.height || '100') || 100}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { height: `${e.target.value}px` } })}
                                className="flex-1 accent-secondary"
                              />
                              <input
                                type="number"
                                value={parseInt(selectedEl.styles?.height || '100') || 100}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { height: `${e.target.value}px` } })}
                                className="w-16 border border-outline-variant rounded p-1 text-xs outline-none bg-surface-container-low"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Opacity</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={selectedEl.styles?.opacity !== undefined ? selectedEl.styles.opacity : 1}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { opacity: parseFloat(e.target.value) } })}
                                className="flex-1 accent-secondary"
                              />
                              <span className="text-xs w-8 text-right">{Math.round((selectedEl.styles?.opacity !== undefined ? selectedEl.styles.opacity : 1) * 100)}%</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Border Radius (px)</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={parseInt(selectedEl.styles?.borderRadius || '0') || 0}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { borderRadius: `${e.target.value}px` } })}
                                className="flex-1 accent-secondary"
                              />
                              <span className="text-xs w-8 text-right">{parseInt(selectedEl.styles?.borderRadius || '0') || 0}px</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* QR Code settings */}
                      {selectedEl.type === 'qr' && (
                        <div>
                          <label className="text-[10px] font-semibold text-on-surface-variant uppercase">QR Code Size (px)</label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="range"
                              min="40"
                              max="300"
                              value={parseInt(selectedEl.styles?.width || '100') || 100}
                              onChange={(e) => updateElement(selectedEl.id, {
                                styles: {
                                  width: `${e.target.value}px`,
                                  height: `${e.target.value}px`
                                }
                              })}
                              className="flex-1 accent-secondary"
                            />
                            <input
                              type="number"
                              value={parseInt(selectedEl.styles?.width || '100') || 100}
                              onChange={(e) => updateElement(selectedEl.id, {
                                styles: {
                                  width: `${e.target.value}px`,
                                  height: `${e.target.value}px`
                                }
                              })}
                              className="w-16 border border-outline-variant rounded p-1 text-xs outline-none bg-surface-container-low"
                            />
                          </div>
                        </div>
                      )}

                      {/* Divider properties */}
                      {selectedEl.type === 'divider' && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Divider Width (px)</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="range"
                                min="10"
                                max="800"
                                value={parseInt(selectedEl.styles?.width || '150') || 150}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { width: `${e.target.value}px` } })}
                                className="flex-1 accent-secondary"
                              />
                              <input
                                type="number"
                                value={parseInt(selectedEl.styles?.width || '150') || 150}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { width: `${e.target.value}px` } })}
                                className="w-16 border border-outline-variant rounded p-1 text-xs outline-none bg-surface-container-low"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Divider Thickness (px)</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="range"
                                min="1"
                                max="20"
                                value={parseInt(selectedEl.styles?.height || '2') || 2}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { height: `${e.target.value}px` } })}
                                className="flex-1 accent-secondary"
                              />
                              <input
                                type="number"
                                value={parseInt(selectedEl.styles?.height || '2') || 2}
                                onChange={(e) => updateElement(selectedEl.id, { styles: { height: `${e.target.value}px` } })}
                                className="w-16 border border-outline-variant rounded p-1 text-xs outline-none bg-surface-container-low"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Divider Color</label>
                            <input
                              type="color"
                              value={selectedEl.styles?.color || '#d4af37'}
                              onChange={(e) => updateElement(selectedEl.id, { styles: { color: e.target.value } })}
                              className="w-full mt-1 h-8 rounded-lg cursor-pointer border p-0.5 bg-surface-container-low border-outline-variant"
                            />
                          </div>
                        </div>
                      )}

                      {/* Seal settings */}
                      {selectedEl.type === 'seal' && (
                        <div>
                          <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Seal Size (px)</label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="range"
                              min="40"
                              max="300"
                              value={parseInt(selectedEl.styles?.width || '80') || 80}
                              onChange={(e) => updateElement(selectedEl.id, {
                                styles: {
                                  width: `${e.target.value}px`,
                                  height: `${e.target.value}px`
                                }
                              })}
                              className="flex-1 accent-secondary"
                            />
                            <input
                              type="number"
                              value={parseInt(selectedEl.styles?.width || '80') || 80}
                              onChange={(e) => updateElement(selectedEl.id, {
                                styles: {
                                  width: `${e.target.value}px`,
                                  height: `${e.target.value}px`
                                }
                              })}
                              className="w-16 border border-outline-variant rounded p-1 text-xs outline-none bg-surface-container-low"
                            />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t">
                        <button onClick={() => duplicateElement(selectedEl.id)} className="flex-1 py-2 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container flex items-center justify-center gap-1.5">
                          <span className="material-symbols-outlined text-xs">content_copy</span>
                          Duplicate
                        </button>
                        <button onClick={() => deleteElement(selectedEl.id)} className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5">
                          <span className="material-symbols-outlined text-xs">delete</span>
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-on-surface-variant opacity-60">
                      <span className="material-symbols-outlined text-4xl">brush</span>
                      <p className="text-xs mt-2">Select canvas element to customize styles</p>
                    </div>
                  )
                )}

                {rightTab === 'document' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-on-surface uppercase border-b pb-1">Default Settings</h4>
                    <div>
                      <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Organisation</label>
                      <input
                        type="text"
                        value={certSettings.org}
                        onChange={(e) => updateCertSettings({ org: e.target.value })}
                        className="w-full mt-1 border border-outline-variant rounded-lg p-2 text-xs outline-none bg-surface-container-low focus:ring-1 focus:ring-secondary focus:border-secondary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Certificate Title</label>
                      <input
                        type="text"
                        value={certSettings.title}
                        onChange={(e) => updateCertSettings({ title: e.target.value })}
                        className="w-full mt-1 border border-outline-variant rounded-lg p-2 text-xs outline-none bg-surface-container-low focus:ring-1 focus:ring-secondary focus:border-secondary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Course Title</label>
                      <input
                        type="text"
                        value={certSettings.course}
                        onChange={(e) => updateCertSettings({ course: e.target.value })}
                        className="w-full mt-1 border border-outline-variant rounded-lg p-2 text-xs outline-none bg-surface-container-low focus:ring-1 focus:ring-secondary focus:border-secondary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Canvas Standard Size</label>
                      <select
                        value={canvasSize}
                        onChange={(e) => setCanvasSize(e.target.value as any)}
                        className="w-full mt-1 border border-outline-variant rounded-lg p-2 text-xs outline-none bg-surface-container-low"
                      >
                        <option value="a4-landscape">A4 Landscape (842×595)</option>
                        <option value="a4-portrait">A4 Portrait (595×842)</option>
                        <option value="hd">HD Standard (960×540)</option>
                        <option value="wide">Wide HD (1200×675)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
