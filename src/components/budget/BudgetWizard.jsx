import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useBudgetStore from '../../store/useBudgetStore';
import { validateDatesBudget } from '../../domain/budget/regles';

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis.'),
  description: z.string().optional(),
  type: z.enum(['projet', 'fonctionnement']),
  exercice: z.coerce.number().int().min(2000).max(2100),
  dateDebut: z.string().min(1, 'La date de début est requise.'),
  dateFin: z.string().min(1, 'La date de fin est requise.'),
  periodicite: z.enum(['mensuel', 'trimestriel', 'semestriel', 'annuel']),
  methode: z.enum(['vierge', 'copie']),
  sourceBudgetId: z.string().optional(),
}).refine(
  data => validateDatesBudget(data.dateDebut, data.dateFin),
  { message: 'La date de fin doit être postérieure à la date de début.', path: ['dateFin'] }
);

export function BudgetWizard({ onClose, onCreated }) {
  const createBudget = useBudgetStore(s => s.createBudget);
  const duplicateBudget = useBudgetStore(s => s.duplicateBudget);
  const updateBudget = useBudgetStore(s => s.updateBudget);
  const budgets = useBudgetStore(s => s.budgets);

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: '', description: '', type: 'fonctionnement', exercice: new Date().getFullYear(),
      dateDebut: `${new Date().getFullYear()}-01-01`,
      dateFin: `${new Date().getFullYear()}-12-31`,
      periodicite: 'mensuel',
      methode: 'vierge', sourceBudgetId: '',
    },
  });

  const methode = watch('methode');

  const onSubmit = (data) => {
    let budget;
    if (data.methode === 'copie' && data.sourceBudgetId) {
      budget = duplicateBudget(data.sourceBudgetId);
      updateBudget(budget.id, {
        nom: data.nom, description: data.description ?? '', type: data.type, exercice: data.exercice,
        dateDebut: data.dateDebut, dateFin: data.dateFin, periodicite: data.periodicite,
      });
    } else {
      budget = createBudget({
        nom: data.nom, description: data.description ?? '', type: data.type, exercice: data.exercice,
        dateDebut: data.dateDebut, dateFin: data.dateFin, periodicite: data.periodicite,
      });
    }
    onCreated(budget.id);
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1A202C', marginTop: 0 }}>
          Nouveau budget
        </h3>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Field label="Nom du budget" error={errors.nom?.message}>
            <input {...register('nom')} placeholder="Ex. Animation réseau 2026" style={inputStyle} />
          </Field>

          <Field label="Description (optionnel)">
            <textarea {...register('description')} placeholder="Notes sur ce budget…" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          <Field label="Type">
            <select {...register('type')} style={inputStyle}>
              <option value="fonctionnement">Fonctionnement</option>
              <option value="projet">Projet</option>
            </select>
          </Field>

          <Field label="Exercice" error={errors.exercice?.message}>
            <input type="number" {...register('exercice')} style={inputStyle} />
          </Field>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Field label="Date de début" error={errors.dateDebut?.message}>
              <input type="date" {...register('dateDebut')} style={inputStyle} />
            </Field>
            <Field label="Date de fin" error={errors.dateFin?.message}>
              <input type="date" {...register('dateFin')} style={inputStyle} />
            </Field>
          </div>

          <Field label="Périodicité de saisie" htmlFor="periodicite">
            <select id="periodicite" {...register('periodicite')} style={inputStyle}>
              <option value="mensuel">Mensuel (12 colonnes)</option>
              <option value="trimestriel">Trimestriel (4 colonnes)</option>
              <option value="semestriel">Semestriel (2 colonnes)</option>
              <option value="annuel">Annuel (1 colonne)</option>
            </select>
          </Field>

          <Field label="Initialisation">
            <Controller
              name="methode"
              control={control}
              render={({ field }) => (
                <select {...field} style={inputStyle}>
                  <option value="vierge">Budget vierge</option>
                  <option value="copie">Copier un budget existant</option>
                </select>
              )}
            />
          </Field>

          {methode === 'copie' && (
            <Field label="Budget source">
              <select {...register('sourceBudgetId')} style={inputStyle}>
                <option value="">— Sélectionner —</option>
                {budgets.map(b => (
                  <option key={b.id} value={b.id}>{b.nom} ({b.exercice})</option>
                ))}
              </select>
            </Field>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Annuler</button>
            <button type="submit" style={btnPrimary}>Créer le budget</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children, htmlFor }) {
  return (
    <div style={{ marginBottom: '14px', flex: 1 }}>
      <label htmlFor={htmlFor} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#718096', marginBottom: '4px' }}>
        {label}
      </label>
      {children}
      {error && <div style={{ fontSize: '12px', color: '#E53935', marginTop: '4px' }}>{error}</div>}
    </div>
  );
}

const overlay = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(26,32,44,0.4)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', zIndex: 100,
};

const card = {
  background: '#FFFFFF', borderRadius: '12px', padding: '24px',
  width: '420px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto',
  boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
};

const inputStyle = {
  width: '100%', padding: '8px 10px', fontSize: '13px',
  border: '1px solid #E2E8F0', borderRadius: '6px', color: '#1A202C', boxSizing: 'border-box',
};

const btnPrimary = {
  padding: '9px 16px', fontSize: '13px', fontWeight: 700, color: '#FFFFFF',
  background: '#31B700', border: 'none', borderRadius: '8px', cursor: 'pointer',
};

const btnSecondary = {
  padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: '#1A202C',
  background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer',
};

export default BudgetWizard;
