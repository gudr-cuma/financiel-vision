import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatAmount, formatAmountFull } from '../../engine/formatUtils';

const CATEGORIES_ORDER = [
  'achats',
  'services_ext',
  'personnel',
  'impots_taxes',
  'dotations',
  'financieres',
  'autres_charges',
];

export default function ChargesMonthlyChart({ categories, monthly, selectedCategoryId }) {
  const labelMap = Object.fromEntries(categories.map((c) => [c.id, c.label]));
  const colorMap = Object.fromEntries(categories.map((c) => [c.id, c.color]));

  // Only render bars for categories that actually exist in the data
  const availableIds = new Set(categories.map((c) => c.id));
  const orderedIds = CATEGORIES_ORDER.filter((id) => availableIds.has(id));

  const selectedCat = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)
    : null;

  const chartTitle = selectedCat
    ? `${selectedCat.label} — mensuel`
    : 'Charges par catégorie — mensuel';

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '16px',
      }}
    >
      <p
        style={{
          color: '#718096',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {chartTitle}
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={monthly}
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="shortLabel"
            tick={{ fontSize: 11, fill: '#718096' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatAmount(v)}
            tick={{ fontSize: 11, fill: '#718096' }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            formatter={(value, name) => [formatAmountFull(value), name]}
            contentStyle={{
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
            }}
          />
          {selectedCat ? (
            <Bar
              key={selectedCat.id}
              dataKey={selectedCat.id}
              name={selectedCat.label}
              fill={selectedCat.color}
            />
          ) : (
            <>
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                iconType="circle"
                iconSize={8}
              />
              {orderedIds.map((id) => (
                <Bar
                  key={id}
                  dataKey={id}
                  name={labelMap[id] ?? id}
                  stackId="a"
                  fill={colorMap[id] ?? '#B1DCE2'}
                />
              ))}
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
