// src/hooks/useProjects.ts
import { useContext } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';

export function useProjects() {
  const context = useContext(ProjectContext);
  
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  
  return context;
}