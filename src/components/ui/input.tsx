import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-3 py-2 rounded-md text-sm transition-colors ${className}`}
        style={{
          backgroundColor: 'var(--input-bg)',
          border: '1px solid var(--input-border)',
          color: 'var(--input-text)',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--input-border-focus)'
          e.target.style.outline = 'none'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--input-border)'
        }}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

