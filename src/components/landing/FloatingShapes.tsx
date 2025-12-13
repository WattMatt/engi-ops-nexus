export const FloatingShapes = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating circles */}
      <div 
        className="absolute w-72 h-72 rounded-full opacity-10 animate-float-slow"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)',
          top: '10%',
          left: '5%',
        }}
      />
      <div 
        className="absolute w-96 h-96 rounded-full opacity-5 animate-float-medium"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary-foreground)) 0%, transparent 70%)',
          top: '50%',
          right: '-10%',
        }}
      />
      <div 
        className="absolute w-48 h-48 rounded-full opacity-10 animate-float-fast"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)',
          bottom: '20%',
          left: '15%',
        }}
      />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
};
