import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import 'firebase/compat/storage';

import type { DesignPurpose, EquipmentItem, SupplyLine, SupplyZone, ScaleInfo, Containment, PVPanelConfig, RoofMask, PVArrayItem, Task } from '../types';

let firebaseApp: firebase.app.App | null = null;
let auth: firebase.auth.Auth | null = null;
let database: firebase.database.Database | null = null;
let storage: firebase.storage.Storage | null = null;
let provider: firebase.auth.GoogleAuthProvider | null = null;

export let isFirebaseInitialized = false;

const WIDGET_ID = 'electrical-markup';

export const initializeFirebase = (config: object) => {
    // Prevent re-initialization
    if (firebase.apps.length > 0) {
        return;
    }
    
    try {
        firebaseApp = firebase.initializeApp(config);
        auth = firebase.auth();
        database = firebase.database();
        storage = firebase.storage();
        provider = new firebase.auth.GoogleAuthProvider();
        isFirebaseInitialized = true;
        console.log("Firebase has been initialized successfully by the host application.");
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        alert("Failed to initialize Firebase. Cloud features will be unavailable. Check the console for details.");
        isFirebaseInitialized = false;
    }
};

export const onAuthChange = (callback: (user: firebase.User | null) => void) => {
    if (!auth || !isFirebaseInitialized) {
        return () => {}; // Return an empty unsubscribe function
    }
    return auth.onAuthStateChanged(callback);
};

export const handleSignIn = () => {
    if (!auth || !provider || !isFirebaseInitialized) {
        alert("Firebase integration is not available. Cannot sign in.");
        return;
    }
    auth.signInWithPopup(provider).catch(error => {
        console.error("Authentication Error:", error);
        alert(`Failed to sign in: ${error.message}`);
    });
};

export const handleSignOut = () => {
    if (!auth || !isFirebaseInitialized) return;
    auth.signOut();
};

export interface DesignData {
    // These are now part of the main design state object
    equipment: EquipmentItem[];
    lines: SupplyLine[];
    zones: SupplyZone[];
    containment: Containment[];
    roofMasks: RoofMask[];
    pvArrays: PVArrayItem[];
    tasks: Task[];

    // These are top-level properties
    designPurpose: DesignPurpose | null;
    scaleInfo: ScaleInfo;
    pvPanelConfig: PVPanelConfig | null;
    
    // Metadata
    pdfStoragePath: string;
    name: string;
    createdAt: string;
}

export const saveDesign = async (user: firebase.User, designName: string, designData: Omit<DesignData, 'pdfStoragePath' | 'name' | 'createdAt'>, pdfFile: File): Promise<void> => {
    if (!database || !storage || !isFirebaseInitialized) throw new Error("Firebase is not available.");

    const userId = user.uid;
    const dbPath = `users/${userId}/${WIDGET_ID}/designs`;
    const designId = database.ref(dbPath).push().key;
    if (!designId) throw new Error("Could not generate design ID.");
    
    // 1. Upload PDF to Storage
    const pdfPath = `users/${userId}/${WIDGET_ID}/designs/${designId}/${pdfFile.name}`;
    const pdfStorageReference = storage.ref(pdfPath);
    await pdfStorageReference.put(pdfFile);

    // 2. Prepare data for Realtime Database
    const dataToSave: DesignData = {
        ...designData,
        pdfStoragePath: pdfPath,
        name: designName,
        createdAt: new Date().toISOString(),
    };

    // 3. Save metadata to Realtime Database
    const dbRef = database.ref(`${dbPath}/${designId}`);
    await dbRef.set(dataToSave);
};

export interface DesignListing {
    id: string;
    name: string;
    createdAt: string;
}

export const listDesigns = async (user: firebase.User): Promise<DesignListing[]> => {
    if (!database || !isFirebaseInitialized) throw new Error("Firebase is not available.");
    const userId = user.uid;
    const designsRef = database.ref(`users/${userId}/${WIDGET_ID}/designs`);
    const snapshot = await designsRef.once('value');
    if (snapshot.exists()) {
        const designs = snapshot.val();
        return Object.keys(designs).map(key => ({
            id: key,
            name: designs[key].name,
            createdAt: designs[key].createdAt,
        })).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
};


export const loadDesign = async (user: firebase.User, designId: string): Promise<{ designData: DesignData; pdfBlob: Blob }> => {
    if (!database || !storage || !isFirebaseInitialized) throw new Error("Firebase is not available.");
    
    // 1. Fetch design metadata from DB
    const userId = user.uid;
    const designRef = database.ref(`users/${userId}/${WIDGET_ID}/designs/${designId}`);
    const snapshot = await designRef.once('value');
    if (!snapshot.exists()) {
        throw new Error("Design not found.");
    }
    const designData: DesignData = snapshot.val();
    
    // 2. Download PDF from Storage
    const pdfStorageReference = storage.ref(designData.pdfStoragePath);
    const url = await pdfStorageReference.getDownloadURL();
    const response = await fetch(url);
    const pdfBlob = await response.blob();
    
    return { designData, pdfBlob };
};
