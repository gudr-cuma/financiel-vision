import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatAmountFull } from '../../engine/formatUtils';

export default function ChargesDonut({ categories, totalCharges, selectedCategoryId, onSelectCategory }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '16px',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <p
        style={{
          color: '#718096',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '8px',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Répartition des charges
      </p>

      {/* Wrapper relatif pour superposer le label central */}
      <div style={{ position: 'relative', width: 300, height: 300, cursor: 'pointer' }}>
        <PieChart width={300} height={300}>
          <Pie
            data={categories}
            dataKey="montant"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={120}
            paddingAngle={2}
            cursor="pointer"
            onClick={(data) => onSelectCategory(data.id)}
          >
            {categories.map((cat) => (
              <Cell
                key={cat.id}
                fill={cat.color}
                opacity={selectedCategoryId && cat.id !== selectedCategoryId ? 0.35 : 1}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatAmountFull(value)}
            contentStyle={{ fontSize: '13px', borderRadius: '6px' }}
          />
        </PieChart>

        {/* Label central absolu, centré dans le trou du donut */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '15px',
              fontWeight: 700,
              color: '#1A202C',
              whiteSpace: 'nowrap',
            }}
          >
            {formatAmountFull(totalCharges)}
          </span>
          <span
            style={{
              display: 'block',
              fontSize: '11px',
              color: '#718096',
              marginTop: '2px',
            }}
          >
            Total charges
          </span>
        </div>
      </div>
    </div>
  );
}
