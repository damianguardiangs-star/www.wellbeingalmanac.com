'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User, Species, CollectionSite, PlantSample,
  ExtractionBatch, AromaProfile, ChemistryResult,
  CommercialScore, AuditLog,
} from './types';
import {
  SEED_SPECIES, SEED_COLLECTION_SITES, SEED_PLANT_SAMPLES,
  SEED_EXTRACTION_BATCHES, SEED_AROMA_PROFILES, SEED_CHEMISTRY_RESULTS,
  SEED_COMMERCIAL_SCORES,
} from './seed-data';

const DEMO_USERS: User[] = [
  { id: 'user-001', email: 'admin@khmere.co', name: 'Damian Guardiangs', role: 'admin', organisation_id: 'org-001' },
  { id: 'user-002', email: 'collector@khmere.co', name: 'Dara Sok', role: 'field_collector', organisation_id: 'org-001' },
  { id: 'user-003', email: 'analyst@khmere.co', name: 'Dr. Lina Var', role: 'lab_analyst', organisation_id: 'org-001' },
  { id: 'user-004', email: 'commercial@khmere.co', name: 'Chan Phally', role: 'commercial_reviewer', organisation_id: 'org-001' },
];

interface KBIStore {
  currentUser: User | null;
  isAuthenticated: boolean;
  species: Species[];
  collectionSites: CollectionSite[];
  plantSamples: PlantSample[];
  extractionBatches: ExtractionBatch[];
  aromaProfiles: AromaProfile[];
  chemistryResults: ChemistryResult[];
  commercialScores: CommercialScore[];
  auditLogs: AuditLog[];

  login: (email: string, password: string) => boolean;
  logout: () => void;
  switchRole: (userId: string) => void;

  addSpecies: (s: Omit<Species, 'id' | 'created_at' | 'updated_at'>) => void;
  updateSpecies: (id: string, s: Partial<Species>) => void;
  deleteSpecies: (id: string) => void;

  addSample: (s: Omit<PlantSample, 'id' | 'created_at' | 'updated_at'>) => void;
  updateSample: (id: string, s: Partial<PlantSample>) => void;
  deleteSample: (id: string) => void;

  addExtraction: (e: Omit<ExtractionBatch, 'id' | 'created_at'>) => void;
  updateExtraction: (id: string, e: Partial<ExtractionBatch>) => void;
  deleteExtraction: (id: string) => void;

  addAromaProfile: (a: Omit<AromaProfile, 'id' | 'created_at'>) => void;
  updateAromaProfile: (id: string, a: Partial<AromaProfile>) => void;
  deleteAromaProfile: (id: string) => void;

  addChemistryResult: (c: Omit<ChemistryResult, 'id' | 'created_at'>) => void;
  deleteChemistryResult: (id: string) => void;

  addCommercialScore: (c: Omit<CommercialScore, 'id' | 'created_at'>) => void;
  updateCommercialScore: (id: string, c: Partial<CommercialScore>) => void;

  addAuditLog: (log: Omit<AuditLog, 'id' | 'created_at'>) => void;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now() {
  return new Date().toISOString();
}

export const useKBIStore = create<KBIStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      species: SEED_SPECIES,
      collectionSites: SEED_COLLECTION_SITES,
      plantSamples: SEED_PLANT_SAMPLES,
      extractionBatches: SEED_EXTRACTION_BATCHES,
      aromaProfiles: SEED_AROMA_PROFILES,
      chemistryResults: SEED_CHEMISTRY_RESULTS,
      commercialScores: SEED_COMMERCIAL_SCORES,
      auditLogs: [],

      login: (email, password) => {
        // Demo: any password works, match on email
        const user = DEMO_USERS.find(u => u.email === email);
        if (user && password === 'demo') {
          set({ currentUser: user, isAuthenticated: true });
          get().addAuditLog({ user_id: user.id, user_name: user.name, action: 'login', entity_type: 'session', entity_id: user.id, changes: {} });
          return true;
        }
        return false;
      },

      logout: () => {
        const user = get().currentUser;
        if (user) get().addAuditLog({ user_id: user.id, user_name: user.name, action: 'logout', entity_type: 'session', entity_id: user.id, changes: {} });
        set({ currentUser: null, isAuthenticated: false });
      },

      switchRole: (userId) => {
        const user = DEMO_USERS.find(u => u.id === userId);
        if (user) set({ currentUser: user, isAuthenticated: true });
      },

      addSpecies: (s) => set(state => ({
        species: [...state.species, { ...s, id: `sp-${uid()}`, created_at: now(), updated_at: now() }],
      })),
      updateSpecies: (id, s) => set(state => ({
        species: state.species.map(x => x.id === id ? { ...x, ...s, updated_at: now() } : x),
      })),
      deleteSpecies: (id) => set(state => ({ species: state.species.filter(x => x.id !== id) })),

      addSample: (s) => set(state => ({
        plantSamples: [...state.plantSamples, { ...s, id: `smp-${uid()}`, created_at: now(), updated_at: now() }],
      })),
      updateSample: (id, s) => set(state => ({
        plantSamples: state.plantSamples.map(x => x.id === id ? { ...x, ...s, updated_at: now() } : x),
      })),
      deleteSample: (id) => set(state => ({ plantSamples: state.plantSamples.filter(x => x.id !== id) })),

      addExtraction: (e) => set(state => ({
        extractionBatches: [...state.extractionBatches, { ...e, id: `ext-${uid()}`, created_at: now() }],
      })),
      updateExtraction: (id, e) => set(state => ({
        extractionBatches: state.extractionBatches.map(x => x.id === id ? { ...x, ...e } : x),
      })),
      deleteExtraction: (id) => set(state => ({ extractionBatches: state.extractionBatches.filter(x => x.id !== id) })),

      addAromaProfile: (a) => set(state => ({
        aromaProfiles: [...state.aromaProfiles, { ...a, id: `aro-${uid()}`, created_at: now() }],
      })),
      updateAromaProfile: (id, a) => set(state => ({
        aromaProfiles: state.aromaProfiles.map(x => x.id === id ? { ...x, ...a } : x),
      })),
      deleteAromaProfile: (id) => set(state => ({ aromaProfiles: state.aromaProfiles.filter(x => x.id !== id) })),

      addChemistryResult: (c) => set(state => ({
        chemistryResults: [...state.chemistryResults, { ...c, id: `chem-${uid()}`, created_at: now() }],
      })),
      deleteChemistryResult: (id) => set(state => ({ chemistryResults: state.chemistryResults.filter(x => x.id !== id) })),

      addCommercialScore: (c) => set(state => ({
        commercialScores: [...state.commercialScores, { ...c, id: `com-${uid()}`, created_at: now() }],
      })),
      updateCommercialScore: (id, c) => set(state => ({
        commercialScores: state.commercialScores.map(x => x.id === id ? { ...x, ...c } : x),
      })),

      addAuditLog: (log) => set(state => ({
        auditLogs: [{ ...log, id: `log-${uid()}`, created_at: now() }, ...state.auditLogs].slice(0, 500),
      })),
    }),
    { name: 'kbi-store' }
  )
);

export const DEMO_USERS_LIST = DEMO_USERS;
