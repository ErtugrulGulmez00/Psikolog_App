import { clsx } from 'clsx'
import { getInitials } from '../../utils/helpers'

const Avatar = ({ 
  src, 
  firstName, 
  lastName, 
  size = 'md', 
  className,
  onClick 
}) => {
  const sizes = {
    xs: 'w-8 h-8 text-xs',
    sm: 'w-10 h-10 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl'
  }

  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        onClick={onClick}
        className={clsx(
          'rounded-full object-cover',
          sizes[size],
          onClick && 'cursor-pointer',
          className
        )}
      />
    )
  }

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-full bg-primary-100 flex items-center justify-center font-semibold text-primary-700',
        sizes[size],
        onClick && 'cursor-pointer',
        className
      )}
    >
      {getInitials(firstName, lastName)}
    </div>
  )
}

export default Avatar



