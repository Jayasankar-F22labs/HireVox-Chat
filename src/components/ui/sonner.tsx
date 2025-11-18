import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[#0a0a0a] group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-white/70',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success: 'group-[.toast]:bg-emerald-500/10 group-[.toast]:border-emerald-500/40 group-[.toast]:text-emerald-200',
          error: 'group-[.toast]:bg-rose-500/10 group-[.toast]:border-rose-500/40 group-[.toast]:text-rose-200',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

