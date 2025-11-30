import { clsx } from 'clsx'

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {Icon && (
        <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mb-4">
          <Icon size={32} className="text-neutral-400" />
        </div>
      )}
      <h3 className="text-lg font-medium text-neutral-900 mb-2">{title}</h3>
      {description && (
        <p className="text-neutral-500 max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}

export default EmptyState



