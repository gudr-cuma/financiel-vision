import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  financeur: z.string().min(1, 'Le financeur est requis.'),
  typeRecette: z.enum(['subvention', 'cotisation', 'prestation', 'autofinancement']),
  montant: z.coerce.number().min(0, 'Le montant doit être positif ou nul.'),
  tauxIntervention: z.coerce.number().min(0).max(1).optional(),
  assietteEligible: z.coerce.number().min(0).optional(),
});

const TYPE_LABELS = {
  subvention: 'Subvention',
  cotisation: 'Cotisation',
  prestation: 'Prestation',
  autofinancement: 'Autofinancement',
};

export function FinanceurForm({ onSubmit }) {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { financeur: '', typeRecette: 'subvention', montant: 0, tauxIntervention: '', assietteEligible: '' },
  });

  const typeRecette = watch('typeRecette');

  const submit = (data) => {
    onSubmit({
      ...data,
      tauxIntervention: data.tauxIntervention || undefined,
      assietteEligible: data.assietteEligible || undefined,
    });
    reset();
  };

  return (
    <form onSubmit={handleSubmit(submit)} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '16px' }}>
      <div>
        <input placeholder="Financeur (ex. Région)" {...register('financeur')} style={inputStyle} />
        {errors.financeur && <div style={errorStyle}>{errors.financeur.message}</div>}
      </div>
      <select {...register('typeRecette')} style={inputStyle}>
        {Object.entries(TYPE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <div>
        <input type="number" step="0.01" placeholder="Montant" {...register('montant')} style={{ ...inputStyle, width: '100px' }} />
        {errors.montant && <div style={errorStyle}>{errors.montant.message}</div>}
      </div>
      {typeRecette === 'subvention' && (
        <>
          <input type="number" step="0.01" placeholder="Taux (0–1)" {...register('tauxIntervention')} style={{ ...inputStyle, width: '90px' }} />
          <input type="number" step="0.01" placeholder="Assiette éligible" {...register('assietteEligible')} style={{ ...inputStyle, width: '120px' }} />
        </>
      )}
      <button type="submit" style={btnPrimary}>+ Ajouter financeur</button>
    </form>
  );
}

const inputStyle = { padding: '7px 10px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px' };
const errorStyle = { fontSize: '11px', color: '#E53935', marginTop: '2px' };
const btnPrimary = {
  padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#FFFFFF',
  background: '#31B700', border: 'none', borderRadius: '6px', cursor: 'pointer',
};

export default FinanceurForm;
