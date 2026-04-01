import { BarChart, Bar, Cell, ResponsiveContainer } from 'recharts';

export function Sparkline({ data, color = '#31B700', height = 40 }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        barCategoryGap="10%"
      >
        <Bar dataKey="value" isAnimationActive={false} radius={[1, 1, 0, 0]}>
          {chartData.map((entry) => (
            <Cell
              key={`cell-${entry.index}`}
              fill={entry.value < 0 ? '#E53935' : color}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default Sparkline;
