import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PortfolioHealthGaugeProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PortfolioHealthGauge({ 
  score, 
  label = "Portfolio Health",
  size = 'lg' 
}: PortfolioHealthGaugeProps) {
  const getColor = (value: number) => {
    if (value >= 80) return "hsl(142, 76%, 36%)"; // Green
    if (value >= 60) return "hsl(45, 93%, 47%)"; // Yellow
    if (value >= 40) return "hsl(24, 95%, 53%)"; // Orange
    return "hsl(0, 84%, 60%)"; // Red
  };

  const getLabel = (value: number) => {
    if (value >= 80) return "Excellent";
    if (value >= 60) return "Good";
    if (value >= 40) return "Needs Attention";
    return "Critical";
  };

  const data = [
    { name: "score", value: score },
    { name: "remaining", value: 100 - score },
  ];

  const sizeConfig = {
    sm: { height: 120, innerRadius: 35, outerRadius: 50, fontSize: 'text-xl' },
    md: { height: 160, innerRadius: 50, outerRadius: 70, fontSize: 'text-2xl' },
    lg: { height: 200, innerRadius: 70, outerRadius: 95, fontSize: 'text-3xl' },
  };

  const config = sizeConfig[size];

  return (
    <Card id="portfolio-health-gauge" className="relative">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground text-center">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-4">
        <div className="relative" style={{ height: config.height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={0}
                innerRadius={config.innerRadius}
                outerRadius={config.outerRadius}
                paddingAngle={0}
                dataKey="value"
              >
                <Cell fill={getColor(score)} />
                <Cell fill="hsl(var(--muted))" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ marginTop: size === 'lg' ? 20 : 10 }}>
            <span className={`${config.fontSize} font-bold`}>{score}%</span>
            <span className="text-xs text-muted-foreground">{getLabel(score)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
