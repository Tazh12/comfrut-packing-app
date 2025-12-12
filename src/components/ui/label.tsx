import React from 'react'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode
}

export const Label: React.FC<LabelProps> = ({ children, className = '', ...props }) => {
  return (
    <label
      className={`block text-sm font-medium ${className}`}
      style={{ color: 'var(--muted-text)' }}
      {...props}
    >
      {children}
    </label>
  )
}

