import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { getDocument } from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { EquipmentItem, SupplyLine, SupplyZone, Containment, RoofMask, PVArrayItem, ScaleInfo, ViewState, PVPanelConfig, DesignPurpose, Task } from '@/types/floor-plan';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

export function initializeSupabase(): SupabaseClient {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials are not configured.');
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

export function isSupabaseInitialized(): boolean {
  return !!supabase && !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

export async function signInWithGoogle(): Promise<void> {
  const client = initializeSupabase();
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const client = initializeSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  const client = initializeSupabase();
  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null);
  });
  
  // Get initial user
  client.auth.getUser().then(({ data }) => {
    callback(data.user);
  });
  
  return () => {
    subscription.unsubscribe();
  };
}

export interface DesignListing {
  id: string;
  name: string;
  createdAt: string;
}

export async function saveDesign(
  name: string,
  designPurpose: DesignPurpose,
  pdfFile: File,
  equipment: EquipmentItem[],
  lines: SupplyLine[],
  zones: SupplyZone[],
  containment: Containment[],
  roofMasks: RoofMask[],
  pvArrays: PVArrayItem[],
  scaleInfo: ScaleInfo | null,
  viewState: ViewState,
  pvPanelConfig: PVPanelConfig | null,
  tasks: Task[]
): Promise<void> {
  const client = initializeSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Upload PDF to storage
  const pdfPath = `${user.id}/${Date.now()}-${pdfFile.name}`;
  const { error: uploadError } = await client.storage
    .from('floor-plans')
    .upload(pdfPath, pdfFile);
  
  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = client.storage
    .from('floor-plans')
    .getPublicUrl(pdfPath);

  // Save design to database
  const stateJson = {
    equipment,
    lines,
    zones,
    containment,
    roofMasks,
    pvArrays,
    scaleInfo,
    viewState,
    pvPanelConfig,
    tasks,
  };

  const { error: insertError } = await client
    .from('floor_plan_projects')
    .insert({
      user_id: user.id,
      name,
      design_purpose: designPurpose,
      pdf_url: urlData.publicUrl,
      state_json: stateJson,
      scale_meters_per_pixel: scaleInfo?.metersPerPixel || null,
    });

  if (insertError) throw insertError;
}

export async function listDesigns(): Promise<DesignListing[]> {
  const client = initializeSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await client
    .from('floor_plan_projects')
    .select('id, name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(d => ({
    id: d.id,
    name: d.name,
    createdAt: d.created_at,
  }));
}

export async function loadDesign(id: string): Promise<{
  pdfDoc: PDFDocumentProxy;
  pdfFile: File;
  designPurpose: DesignPurpose;
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  zones: SupplyZone[];
  containment: Containment[];
  roofMasks: RoofMask[];
  pvArrays: PVArrayItem[];
  scaleInfo: ScaleInfo | null;
  viewState: ViewState;
  pvPanelConfig: PVPanelConfig | null;
  tasks: Task[];
}> {
  const client = initializeSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await client
    .from('floor_plan_projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Design not found');

  // Fetch PDF from storage
  const response = await fetch(data.pdf_url);
  const blob = await response.blob();
  const pdfFile = new File([blob], data.name + '.pdf', { type: 'application/pdf' });
  
  const arrayBuffer = await blob.arrayBuffer();
  const pdfDoc = await getDocument({ data: arrayBuffer }).promise;

  const state = data.state_json as any;

  return {
    pdfDoc,
    pdfFile,
    designPurpose: data.design_purpose as DesignPurpose,
    equipment: state.equipment || [],
    lines: state.lines || [],
    zones: state.zones || [],
    containment: state.containment || [],
    roofMasks: state.roofMasks || [],
    pvArrays: state.pvArrays || [],
    scaleInfo: state.scaleInfo || null,
    viewState: state.viewState || { zoom: 1, offset: { x: 0, y: 0 } },
    pvPanelConfig: state.pvPanelConfig || null,
    tasks: state.tasks || [],
  };
}