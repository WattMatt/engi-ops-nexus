import { AnimatedCounter } from "./AnimatedCounter";
import { Zap, Building, Users, Clock } from "lucide-react";

const stats = [
  { icon: Building, value: 150, suffix: "+", label: "Projects Completed" },
  { icon: Users, value: 50, suffix: "+", label: "Active Clients" },
  { icon: Zap, value: 99, suffix: "%", label: "Uptime" },
  { icon: Clock, value: 24, suffix: "/7", label: "Support" },
];

export const StatsSection = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
      {stats.map((stat, index) => (
        <div 
          key={stat.label}
          className="text-center p-4 opacity-0 animate-fade-in"
          style={{ animationDelay: `${600 + index * 100}ms`, animationFillMode: 'forwards' }}
        >
          <stat.icon className="h-8 w-8 text-accent mx-auto mb-2" />
          <div className="text-3xl md:text-4xl font-bold text-white mb-1">
            <AnimatedCounter end={stat.value} suffix={stat.suffix} />
          </div>
          <p className="text-white/70 text-sm">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};
