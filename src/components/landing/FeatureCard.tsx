import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) => {
  return (
    <div 
      className="group bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 
                 hover:bg-white/15 hover:border-white/30 hover:scale-105 
                 transition-all duration-300 ease-out cursor-default
                 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="p-3 rounded-lg bg-white/10 w-fit mb-4 
                      group-hover:bg-accent/20 group-hover:scale-110 
                      transition-all duration-300">
        <Icon className="h-6 w-6 text-white group-hover:text-accent transition-colors duration-300" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-accent transition-colors duration-300">
        {title}
      </h3>
      <p className="text-white/80">
        {description}
      </p>
    </div>
  );
};
