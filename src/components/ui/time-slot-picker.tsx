import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TimeSlotPickerProps {
  value?: string;
  onChange: (time: string) => void;
  doctorId?: string;
  appointmentDate?: Date;
}

interface SlotAvailability {
  time: string;
  count: number;
  maxSlots: number;
}

export const TimeSlotPicker = ({ value, onChange, doctorId, appointmentDate }: TimeSlotPickerProps) => {
  const [morningOpen, setMorningOpen] = useState(true);
  const [eveningOpen, setEveningOpen] = useState(true);
  const [slotAvailability, setSlotAvailability] = useState<Record<string, SlotAvailability>>({});

  // Generate morning slots (10:00 - 12:30, 15-min intervals)
  const morningSlots = [];
  for (let hour = 10; hour <= 12; hour++) {
    for (let min = 0; min < 60; min += 15) {
      if (hour === 12 && min > 30) break;
      const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      morningSlots.push(time);
    }
  }

  // Generate evening slots (17:00 - 19:00+, 15-min intervals before 19:00, 5-min after)
  const eveningSlots = [];
  // 17:00 to 19:00 in 15-min intervals
  for (let hour = 17; hour < 19; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      eveningSlots.push(time);
    }
  }
  // 19:00+ in 5-min intervals (unlimited slots)
  for (let hour = 19; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 5) {
      if (hour === 20 && min > 0) break;
      const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      eveningSlots.push(time);
    }
  }

  useEffect(() => {
    if (!doctorId || !appointmentDate) {
      setSlotAvailability({});
      return;
    }

    const fetchSlotAvailability = async () => {
      const dateStr = format(appointmentDate, "yyyy-MM-dd");
      
      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', dateStr);

      const availability: Record<string, SlotAvailability> = {};

      // Count appointments per slot
      [...morningSlots, ...eveningSlots].forEach(slot => {
        const [hours, minutes] = slot.split(':').map(Number);
        const slotStart = hours * 60 + minutes;
        const slotEnd = slotStart + 15;
        
        // Check if this is after 19:00 (unlimited slots)
        const isUnlimited = hours >= 19;
        
        const count = appointments?.filter(apt => {
          const [aptHours, aptMinutes] = apt.appointment_time.split(':').map(Number);
          const aptTime = aptHours * 60 + aptMinutes;
          return aptTime >= slotStart && aptTime < slotEnd;
        }).length || 0;

        availability[slot] = {
          time: slot,
          count,
          maxSlots: isUnlimited ? 999 : 3 // Effectively unlimited after 7pm
        };
      });

      setSlotAvailability(availability);
    };

    fetchSlotAvailability();
  }, [doctorId, appointmentDate]);

  const getSlotClassName = (slot: string) => {
    const availability = slotAvailability[slot];
    if (!availability) return "bg-background hover:bg-accent";

    const fillRatio = availability.count / availability.maxSlots;
    
    if (availability.count >= availability.maxSlots && availability.maxSlots < 999) {
      return "bg-destructive/20 text-destructive cursor-not-allowed";
    }

    if (fillRatio >= 0.66) {
      return "bg-primary/70 text-primary-foreground hover:bg-primary/80";
    } else if (fillRatio >= 0.33) {
      return "bg-primary/40 text-foreground hover:bg-primary/50";
    }
    
    return "bg-background hover:bg-accent";
  };

  const isSlotAvailable = (slot: string) => {
    const availability = slotAvailability[slot];
    if (!availability) return true;
    return availability.count < availability.maxSlots;
  };

  const formatTimeLabel = (time: string) => {
    const [hours, mins] = time.split(':').map(Number);
    const hour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const period = hours >= 12 ? 'PM' : 'AM';
    return `${hour}:${String(mins).padStart(2, '0')} ${period}`;
  };

  const getSlotInfo = (slot: string) => {
    const availability = slotAvailability[slot];
    if (!availability) return '';
    
    if (availability.maxSlots >= 999) {
      return availability.count > 0 ? `${availability.count} booked` : '';
    }
    
    return `${availability.count}/${availability.maxSlots}`;
  };

  return (
    <div className="space-y-4 p-4">
      {/* Morning Section */}
      <Collapsible open={morningOpen} onOpenChange={setMorningOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <span className="font-semibold">Morning (10:00 AM - 12:30 PM)</span>
          {morningOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="grid grid-cols-3 gap-2">
            {morningSlots.map(slot => {
              const selected = value === slot;
              const available = isSlotAvailable(slot);
              
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={!available}
                  onClick={() => available && onChange(slot)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-sm",
                    selected && "border-primary ring-2 ring-primary/20",
                    !selected && "border-transparent",
                    getSlotClassName(slot),
                    !available && "opacity-50"
                  )}
                >
                  <div className="font-medium">{formatTimeLabel(slot)}</div>
                  <div className="text-xs opacity-70 mt-1">{getSlotInfo(slot)}</div>
                </button>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Evening Section */}
      <Collapsible open={eveningOpen} onOpenChange={setEveningOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <span className="font-semibold">Evening (5:00 PM - 8:00 PM)</span>
          {eveningOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="grid grid-cols-3 gap-2">
            {eveningSlots.map(slot => {
              const selected = value === slot;
              const available = isSlotAvailable(slot);
              const [hours] = slot.split(':').map(Number);
              const isUnlimited = hours >= 19;
              
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={!available}
                  onClick={() => available && onChange(slot)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-sm",
                    selected && "border-primary ring-2 ring-primary/20",
                    !selected && "border-transparent",
                    getSlotClassName(slot),
                    !available && "opacity-50"
                  )}
                >
                  <div className="font-medium">{formatTimeLabel(slot)}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {isUnlimited && getSlotInfo(slot) ? getSlotInfo(slot) : !isUnlimited ? getSlotInfo(slot) : ''}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3 px-1">
            * After 7:00 PM - Unlimited appointments available
          </p>
        </CollapsibleContent>
      </Collapsible>

      {!doctorId || !appointmentDate ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Please select a doctor and date first
        </p>
      ) : null}
    </div>
  );
};
