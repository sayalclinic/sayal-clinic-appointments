import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Appointment } from '@/hooks/useAppointments';

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
}

export const AppointmentCalendar = ({ 
  appointments, 
  onDateSelect, 
  selectedDate 
}: AppointmentCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const daysInMonth = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAppointmentsForDate = (date: Date) => {
    // Format date to local timezone to avoid UTC offset issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    // Only show active appointments (not completed, denied, or missed)
    return appointments.filter(apt => 
      apt.appointment_date === dateStr && 
      apt.status !== 'completed' && 
      apt.status !== 'denied' && 
      apt.status !== 'missed'
    );
  };

  const getInactiveAppointmentsForDate = (date: Date) => {
    // Get completed, denied, or missed appointments
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return appointments.filter(apt => 
      apt.appointment_date === dateStr && 
      (apt.status === 'completed' || apt.status === 'denied' || apt.status === 'missed')
    );
  };

  const getIntensityClass = (appointmentCount: number) => {
    if (appointmentCount === 0) return '';
    if (appointmentCount <= 2) return 'bg-primary/10';
    if (appointmentCount <= 4) return 'bg-primary/20';
    if (appointmentCount <= 6) return 'bg-primary/30';
    return 'bg-primary/40';
  };

  const previousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <span>{format(currentMonth, 'MMMM yyyy')}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map(date => {
            const dayAppointments = getAppointmentsForDate(date);
            const appointmentCount = dayAppointments.length;
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isDayToday = isToday(date);

            return (
              <button
                key={date.toISOString()}
                onClick={() => onDateSelect?.(date)}
                className={cn(
                  'p-2 min-h-[120px] text-left rounded-lg border smooth-transition hover:border-primary/50 hover:scale-[1.02]',
                  'flex flex-col items-start justify-start',
                  isSameMonth(date, currentMonth) 
                    ? 'border-border hover:bg-medical-light/30' 
                    : 'border-transparent text-muted-foreground/50',
                  getIntensityClass(appointmentCount),
                  isSelected && 'border-primary bg-primary/10 animate-scale-in',
                  isDayToday && 'border-primary bg-primary/5 font-semibold animate-bounce-in'
                )}
              >
                <span className={cn(
                  'text-sm',
                  isDayToday && 'text-primary font-bold'
                )}>
                  {format(date, 'd')}
                </span>
                {appointmentCount > 0 && (
                  <div className="mt-1 space-y-1">
                    <Badge 
                      variant="secondary" 
                      className="text-xs py-0 px-1 h-4 bg-primary/20 text-primary"
                    >
                      {appointmentCount}
                    </Badge>
                    {appointmentCount <= 3 && (
                      <div className="space-y-0.5">
                        {dayAppointments.slice(0, 3).map(apt => (
                          <div 
                            key={apt.id}
                            className="text-xs bg-primary/10 px-1 py-0.5 rounded smooth-transition hover:bg-primary/20"
                          >
                            <div className="text-medical-dark/80 truncate font-medium">
                              {apt.patients?.name}
                            </div>
                            <div className="text-primary text-xs">
                              {apt.appointment_time}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-primary/10 rounded-sm border"></div>
            <span>1-2 appointments</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-primary/20 rounded-sm border"></div>
            <span>3-4 appointments</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-primary/30 rounded-sm border"></div>
            <span>5-6 appointments</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-primary/40 rounded-sm border"></div>
            <span>7+ appointments</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};