import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AmortissementEditionView } from '../components/immobilisations/AmortissementEditionView';

const exploitationData = {
  synthese: { dateDebutExercice: '01/01/2025', dateFinExercice: '31/12/2025' },
  immobilisations: [
    { nBien: 150, libelle: 'TRACTEUR JD 6R195', compteImmo: '21450000',
      valeurEntree: 8861, ecoMethode: 1, ecoDuree: 10, axe1: '4',
      dateAcquisition: new Date(2022, 11, 31), dateCession: null },
  ],
  immoLignes: [
    { nBien: 150, dateFinExo: new Date(2024, 11, 31), ecoMtResiduel: 7088.8 },
    { nBien: 150, dateFinExo: new Date(2025, 11, 31), ecoMtResiduel: 6202.7 },
  ],
};

describe('AmortissementEditionView', () => {
  it('affiche en-tête de compte, racines et le bien', () => {
    render(<AmortissementEditionView exploitationData={exploitationData} />);
    expect(screen.getByText(/Agencements/)).toBeInTheDocument();
    expect(screen.getByText(/TRACTEUR JD 6R195/)).toBeInTheDocument();
    expect(screen.getByText(/2145 - 28145/)).toBeInTheDocument();
  });
});
