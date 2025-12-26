import { useState, useCallback } from 'react';

interface DetectedCircuit {
  ref: string;
  type: string;
  description?: string;
  confirmed?: boolean;
}

interface DetectedDB {
  name: string;
  location?: string;
  circuits: DetectedCircuit[];
  confirmed?: boolean;
}

export interface AccumulatedScanResult {
  distribution_boards: DetectedDB[];
  scanCount: number;
  lastScanConfidence: 'high' | 'medium' | 'low';
}

export function useMultiScanAccumulator() {
  const [accumulatedResults, setAccumulatedResults] = useState<AccumulatedScanResult>({
    distribution_boards: [],
    scanCount: 0,
    lastScanConfidence: 'low',
  });

  const addScanResults = useCallback((newResults: {
    distribution_boards: DetectedDB[];
    confidence: 'high' | 'medium' | 'low';
  }) => {
    setAccumulatedResults(prev => {
      const existingDBs = [...prev.distribution_boards];
      
      // Merge new DBs with existing ones
      for (const newDB of newResults.distribution_boards) {
        const existingIndex = existingDBs.findIndex(
          db => db.name.toLowerCase() === newDB.name.toLowerCase()
        );
        
        if (existingIndex >= 0) {
          // Merge circuits into existing DB
          const existingDB = existingDBs[existingIndex];
          for (const newCircuit of newDB.circuits) {
            const circuitExists = existingDB.circuits.some(
              c => c.ref.toLowerCase() === newCircuit.ref.toLowerCase()
            );
            if (!circuitExists) {
              existingDB.circuits.push({ ...newCircuit, confirmed: false });
            }
          }
          // Update location if not set
          if (!existingDB.location && newDB.location) {
            existingDB.location = newDB.location;
          }
        } else {
          // Add new DB
          existingDBs.push({
            ...newDB,
            confirmed: false,
            circuits: newDB.circuits.map(c => ({ ...c, confirmed: false })),
          });
        }
      }
      
      return {
        distribution_boards: existingDBs,
        scanCount: prev.scanCount + 1,
        lastScanConfidence: newResults.confidence,
      };
    });
  }, []);

  const confirmDB = useCallback((dbName: string) => {
    setAccumulatedResults(prev => ({
      ...prev,
      distribution_boards: prev.distribution_boards.map(db =>
        db.name === dbName ? { ...db, confirmed: true } : db
      ),
    }));
  }, []);

  const confirmCircuit = useCallback((dbName: string, circuitRef: string) => {
    setAccumulatedResults(prev => ({
      ...prev,
      distribution_boards: prev.distribution_boards.map(db =>
        db.name === dbName
          ? {
              ...db,
              circuits: db.circuits.map(c =>
                c.ref === circuitRef ? { ...c, confirmed: true } : c
              ),
            }
          : db
      ),
    }));
  }, []);

  const removeDB = useCallback((dbName: string) => {
    setAccumulatedResults(prev => ({
      ...prev,
      distribution_boards: prev.distribution_boards.filter(db => db.name !== dbName),
    }));
  }, []);

  const removeCircuit = useCallback((dbName: string, circuitRef: string) => {
    setAccumulatedResults(prev => ({
      ...prev,
      distribution_boards: prev.distribution_boards.map(db =>
        db.name === dbName
          ? { ...db, circuits: db.circuits.filter(c => c.ref !== circuitRef) }
          : db
      ),
    }));
  }, []);

  const updateDBName = useCallback((oldName: string, newName: string) => {
    setAccumulatedResults(prev => ({
      ...prev,
      distribution_boards: prev.distribution_boards.map(db =>
        db.name === oldName ? { ...db, name: newName } : db
      ),
    }));
  }, []);

  const updateCircuitRef = useCallback((dbName: string, oldRef: string, newRef: string) => {
    setAccumulatedResults(prev => ({
      ...prev,
      distribution_boards: prev.distribution_boards.map(db =>
        db.name === dbName
          ? {
              ...db,
              circuits: db.circuits.map(c =>
                c.ref === oldRef ? { ...c, ref: newRef } : c
              ),
            }
          : db
      ),
    }));
  }, []);

  const clearResults = useCallback(() => {
    setAccumulatedResults({
      distribution_boards: [],
      scanCount: 0,
      lastScanConfidence: 'low',
    });
  }, []);

  const getConfirmedOnly = useCallback(() => {
    return {
      distribution_boards: accumulatedResults.distribution_boards
        .filter(db => db.confirmed)
        .map(db => ({
          ...db,
          circuits: db.circuits.filter(c => c.confirmed),
        })),
    };
  }, [accumulatedResults]);

  return {
    accumulatedResults,
    addScanResults,
    confirmDB,
    confirmCircuit,
    removeDB,
    removeCircuit,
    updateDBName,
    updateCircuitRef,
    clearResults,
    getConfirmedOnly,
  };
}
