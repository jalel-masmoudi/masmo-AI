import type { SVGProps } from 'react'

interface LogoProps extends SVGProps<SVGSVGElement> {
  size?: number
}

export function Logo({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        {/* Core Gradients */}
        <linearGradient id="logo-accent-grad" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="50%" stopColor="#5e6ad2" />
          <stop offset="100%" stopColor="#a5b4fc" />
        </linearGradient>

        <linearGradient id="logo-twin-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        {/* Glow Filters */}
        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        <filter id="logo-intense-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" result="blur1" />
          <feGaussianBlur stdDeviation="4" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Decorative Outer Aura / Cybernetic Hexagon Background */}
      <path
        d="M60 10 L103.3 35 L103.3 85 L60 110 L16.7 85 L16.7 35 Z"
        fill="none"
        stroke="url(#logo-accent-grad)"
        strokeWidth="1.5"
        strokeOpacity="0.15"
      />

      <path
        d="M60 18 L96.4 39 L96.4 81 L60 102 L23.6 81 L23.6 39 Z"
        fill="none"
        stroke="url(#logo-twin-grad)"
        strokeWidth="1"
        strokeOpacity="0.1"
      />

      {/* Background Glow Ring */}
      <circle
        cx="60"
        cy="60"
        r="32"
        fill="none"
        stroke="url(#logo-accent-grad)"
        strokeWidth="4"
        strokeOpacity="0.06"
        filter="url(#logo-glow)"
      />

      {/* Outer Connective Nodes & Digital Twin Framework (forming an 'M' network) */}
      <g strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
        {/* Connection Paths */}
        <path
          d="M25 80 L25 40 L60 65 L95 40 L95 80"
          stroke="url(#logo-accent-grad)"
          strokeWidth="3.5"
          filter="url(#logo-glow)"
        />
        
        {/* Core Twin Overlay Layer (Shifted and Intersecting) */}
        <path
          d="M30 82 L30 45 L60 70 L90 45 L90 82"
          stroke="url(#logo-twin-grad)"
          strokeWidth="2"
          strokeDasharray="4 3"
        />

        {/* Central Investigation Core Pillar */}
        <line
          x1="60"
          y1="25"
          x2="60"
          y2="95"
          stroke="url(#logo-twin-grad)"
          strokeWidth="2"
          strokeOpacity="0.6"
        />

        {/* Intersecting cross connections */}
        <line x1="25" y1="40" x2="60" y2="25" stroke="url(#logo-accent-grad)" strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="95" y1="40" x2="60" y2="25" stroke="url(#logo-accent-grad)" strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="25" y1="80" x2="60" y2="95" stroke="url(#logo-accent-grad)" strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="95" y1="80" x2="60" y2="95" stroke="url(#logo-accent-grad)" strokeWidth="1.5" strokeOpacity="0.4" />
      </g>

      {/* Node Points (Glow Spheres) */}
      {/* Central Twin Nucleus (The Investigation Agent Core) */}
      <circle
        cx="60"
        cy="60"
        r="9"
        fill="url(#logo-twin-grad)"
        filter="url(#logo-intense-glow)"
      />
      <circle
        cx="60"
        cy="60"
        r="4"
        fill="#ffffff"
      />

      {/* Top Nucleus Point */}
      <circle
        cx="60"
        cy="25"
        r="5"
        fill="url(#logo-accent-grad)"
        filter="url(#logo-glow)"
      />
      
      {/* Bottom Nucleus Point */}
      <circle
        cx="60"
        cy="95"
        r="5"
        fill="url(#logo-accent-grad)"
        filter="url(#logo-glow)"
      />

      {/* Left Pillars */}
      <circle
        cx="25"
        cy="40"
        r="6"
        fill="url(#logo-accent-grad)"
        filter="url(#logo-glow)"
      />
      <circle cx="25" cy="40" r="2.5" fill="#ffffff" />
      
      <circle
        cx="25"
        cy="80"
        r="6"
        fill="url(#logo-accent-grad)"
        filter="url(#logo-glow)"
      />
      
      {/* Right Pillars */}
      <circle
        cx="95"
        cy="40"
        r="6"
        fill="url(#logo-accent-grad)"
        filter="url(#logo-glow)"
      />
      <circle cx="95" cy="40" r="2.5" fill="#ffffff" />

      <circle
        cx="95"
        cy="80"
        r="6"
        fill="url(#logo-accent-grad)"
        filter="url(#logo-glow)"
      />
    </svg>
  )
}
