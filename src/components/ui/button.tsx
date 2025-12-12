import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border focus:ring-blue-500'
  }

  const getVariantStyle = (variant: string) => {
    if (variant === 'outline') {
      return {
        borderColor: 'var(--input-border)',
        backgroundColor: 'var(--card-bg)',
        color: 'var(--title-text)',
      }
    }
    return {}
  }
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      style={getVariantStyle(variant)}
      onMouseEnter={(e) => {
        if (variant === 'outline') {
          e.currentTarget.style.backgroundColor = 'var(--card-hover-bg)'
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'outline') {
          e.currentTarget.style.backgroundColor = 'var(--card-bg)'
        }
      }}
      {...props}
    >
      {children}
    </button>
  )
} 