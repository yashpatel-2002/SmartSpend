import { useEffect, useState } from 'react'

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary', 
  type = 'spinner',
  text = 'Loading...',
  fullScreen = false,
  overlay = false
}) => {
  const [progress, setProgress] = useState(0)

  // Simulate progress for the progress bar type
  useEffect(() => {
    if (type === 'progress') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          return prev + 10
        })
      }, 200)
      return () => clearInterval(interval)
    }
  }, [type])

  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }

  const spinnerVariants = {
    spinner: (
      <div className={`relative ${sizeClasses[size]}`}>
        <div className={`absolute inset-0 rounded-full border-4 border-${color}/20`} />
        <div className={`absolute inset-0 rounded-full border-4 border-${color} border-t-transparent animate-spin`} />
      </div>
    ),
    dots: (
      <div className="flex space-x-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`
              ${size === 'xs' ? 'w-2 h-2' : ''}
              ${size === 'sm' ? 'w-2.5 h-2.5' : ''}
              ${size === 'md' ? 'w-3 h-3' : ''}
              ${size === 'lg' ? 'w-4 h-4' : ''}
              ${size === 'xl' ? 'w-5 h-5' : ''}
              bg-${color} rounded-full animate-bounce
            `}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    ),
    pulse: (
      <div className="relative">
        <div className={`${sizeClasses[size]} bg-${color} rounded-full animate-ping opacity-75`} />
        <div className={`absolute inset-0 ${sizeClasses[size]} bg-${color} rounded-full`} />
      </div>
    ),
    progress: (
      <div className="w-64 space-y-2">
        <div className="flex justify-between text-sm text-base-content/60">
          <span>{text}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-base-200 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r from-${color} to-${color}/60 rounded-full transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    ),
    gradient: (
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-primary via-secondary to-accent animate-spin`} />
        <div className={`absolute inset-1 ${sizeClasses[size]} bg-base-100 rounded-full`} />
      </div>
    ),
    wave: (
      <div className="flex space-x-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`
              ${size === 'xs' ? 'w-1 h-4' : ''}
              ${size === 'sm' ? 'w-1.5 h-5' : ''}
              ${size === 'md' ? 'w-2 h-6' : ''}
              ${size === 'lg' ? 'w-2.5 h-8' : ''}
              ${size === 'xl' ? 'w-3 h-10' : ''}
              bg-${color} rounded-full animate-wave
            `}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    ),
    ring: (
      <div className="relative">
        <svg className={`animate-spin ${sizeClasses[size]}`} viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <circle
            className="opacity-75"
            cx="12"
            cy="12"
            r="10"
            stroke="url(#gradient)"
            strokeWidth="4"
            fill="none"
            strokeDasharray="30 60"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    )
  }

  const containerClasses = `
    ${fullScreen ? 'fixed inset-0 z-50 flex items-center justify-center' : ''}
    ${overlay ? 'bg-base-100/80 backdrop-blur-sm' : ''}
    ${fullScreen || overlay ? 'p-4' : ''}
  `

  const spinnerContent = spinnerVariants[type] || spinnerVariants.spinner

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center justify-center gap-4">
        {spinnerContent}
        {text && type !== 'progress' && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-base-content/60 animate-pulse">{text}</p>
            <p className="text-xs text-base-content/40">Please wait</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Add custom animation to tailwind.config.js
const style = document.createElement('style')
style.textContent = `
  @keyframes wave {
    0%, 100% { transform: scaleY(0.5); }
    50% { transform: scaleY(1.5); }
  }
  .animate-wave {
    animation: wave 1s ease-in-out infinite;
  }
`
document.head.appendChild(style)

export default LoadingSpinner