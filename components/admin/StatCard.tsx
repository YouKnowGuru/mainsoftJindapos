import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export default function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("hover-lift border-slate-100 shadow-sm overflow-hidden relative group", className)}>
      <div className="absolute top-0 right-0 w-16 h-16 bg-bhutan-maroon/5 blur-2xl group-hover:bg-bhutan-gold/10 transition-colors duration-500" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-bhutan-maroon transition-colors">{title}</CardTitle>
        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-bhutan-maroon group-hover:text-bhutan-gold transition-all duration-500 shadow-sm border border-slate-100">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-slate-800 group-hover:text-bhutan-maroon transition-colors">{value}</div>
        {(description || trend) && (
          <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
            {trend && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-md bg-slate-50 font-black',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? '↑' : '↓'}
                {trend.value}%
              </span>
            )}
            <span className="opacity-70">{description}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
