import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  Timestamp,
  deleteDoc
} from 'firebase/firestore';

export interface ElementStyles {
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: string;
  border?: string;
  width?: string;
  height?: string;
  zIndex?: number;
  src?: string;
  opacity?: number;
  borderRadius?: string;
}

export interface DesignerElement {
  id: string;
  type: 'text' | 'qr' | 'border' | 'divider' | 'seal' | 'image';
  role?: string;
  left: string;
  top: string;
  value?: string;
  styles?: ElementStyles;
  locked?: boolean;
  hidden?: boolean;
  name?: string;
}

export interface TemplateData {
  id: string;
  name: string;
  elements: DesignerElement[];
  background: string;
  backgroundImage?: string;
  backgroundSize?: string;
  width: string;
  height: string;
  colorBg?: string;
  colorAccent?: string;
  colorText?: string;
  createdAt: string;
  updatedAt: string;
}

// Fetch all templates
export const getTemplates = async (): Promise<TemplateData[]> => {
  try {
    const templatesCol = collection(db, 'templates');
    const snapshot = await getDocs(templatesCol);
    const list: TemplateData[] = [];
    snapshot.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() } as TemplateData);
    });
    return list;
  } catch (e) {
    console.error('Error getting templates:', e);
    return [];
  }
};

// Save a template
export const saveTemplate = async (template: TemplateData): Promise<void> => {
  try {
    const templateDocRef = doc(db, 'templates', template.id);
    await setDoc(templateDocRef, {
      ...template,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.error('Error saving template:', e);
    throw e;
  }
};

// Delete a template
export const deleteTemplate = async (id: string): Promise<void> => {
  try {
    const templateDocRef = doc(db, 'templates', id);
    await deleteDoc(templateDocRef);
  } catch (e) {
    console.error('Error deleting template:', e);
    throw e;
  }
};

// Fetch certificates log
export const getCertificatesLog = async (limitCount = 100): Promise<any[]> => {
  try {
    const certsCol = collection(db, 'certificates');
    const q = query(certsCol, orderBy('issuedAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    const list: any[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        ...data,
        issuedAt: data.issuedAt instanceof Timestamp ? data.issuedAt.toDate().toISOString() : data.issuedAt
      });
    });
    return list;
  } catch (e) {
    console.error('Error getting certificates log:', e);
    return [];
  }
};
