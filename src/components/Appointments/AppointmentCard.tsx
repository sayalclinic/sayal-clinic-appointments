import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, User, FileText, Phone, Stethoscope, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Appointment } from '@/hooks/useAppointments';

interface AppointmentCardProps {
  appointment: Appointment;
  onApprove?: (appointmentId: string) => void;
  onDeny?: (appointmentId: string, reason: string) => void;
  onEdit?: (appointmentId: string) => void;
  onComplete?: (appointmentId: string) => void;
  onMissed?: (appointmentId: string) => void;
  showActions?: boolean;
}

export const AppointmentCard = ({
  appointment,
  onApprove,
  onDeny,
  onEdit,
  onComplete,
  onMissed,
  showActions = true,
}: AppointmentCardProps) => {
  const [denyReason, setDenyReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { profile } = useAuth();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'denied':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'missed':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const handleDeny = () => {
    if (denyReason.trim() && onDeny) {
      onDeny(appointment.id, denyReason);
      setDenyReason('');
      setIsDialogOpen(false);
    }
  };

  const isPastAppointment = () => {
    const appointmentDateTime = new Date(`${appointment.appointment_date} ${appointment.appointment_time}`);
    return appointmentDateTime < new Date();
  };

  return (
    <Card className="hover:shadow-card-hover transition-all duration-200 border-l-4 border-l-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h4 className="font-semibold text-medical-dark text-lg">
                {appointment.patients?.name}
              </h4>
              <Badge variant="outline" className={getStatusColor(appointment.status)}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(appointment.appointment_date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{appointment.appointment_time}</span>
              </div>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-primary" />
                  <span>Appointment Details</span>
                </DialogTitle>
                <DialogDescription>
                  Complete information about this appointment
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Patient Information */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-medical-dark">Patient Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Name:</span> {appointment.patients?.name}
                    </div>
                    <div>
                      <span className="font-medium">Age:</span> {appointment.patients?.age} years
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center space-x-1">
                        <Phone className="w-4 h-4" />
                        <span className="font-medium">Contact:</span> {appointment.patients?.contact_no}
                      </div>
                    </div>
                    {appointment.patients?.medical_history && (
                      <div className="col-span-2">
                        <span className="font-medium">Medical History:</span>
                        <p className="text-muted-foreground mt-1">{appointment.patients.medical_history}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Appointment Information */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-medical-dark">Appointment Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Stethoscope className="w-4 h-4" />
                      <span className="font-medium">Doctor:</span> Dr. {appointment.doctor_profile?.name}
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Receptionist:</span> {appointment.receptionist_profile?.name}
                    </div>
                    {appointment.reason_for_visit && (
                      <div className="col-span-2">
                        <span className="font-medium">Reason for Visit:</span>
                        <p className="text-muted-foreground mt-1">{appointment.reason_for_visit}</p>
                      </div>
                    )}
                    {appointment.symptoms && (
                      <div className="col-span-2">
                        <span className="font-medium">Symptoms:</span>
                        <p className="text-muted-foreground mt-1">{appointment.symptoms}</p>
                      </div>
                    )}
                    {appointment.denial_reason && (
                      <div className="col-span-2">
                        <div className="flex items-start space-x-1 text-destructive">
                          <AlertCircle className="w-4 h-4 mt-0.5" />
                          <div>
                            <span className="font-medium">Denial Reason:</span>
                            <p className="mt-1">{appointment.denial_reason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Stethoscope className="w-4 h-4 text-muted-foreground" />
              <span className="text-medical-dark">Dr. {appointment.doctor_profile?.name}</span>
            </div>
            {appointment.reason_for_visit && (
              <div className="flex items-center space-x-1">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{appointment.reason_for_visit}</span>
              </div>
            )}
          </div>

          {showActions && (
            <div className="flex items-center space-x-2">
              {/* Doctor Actions */}
              {profile?.role === 'doctor' && appointment.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90 text-white"
                    onClick={() => onApprove?.(appointment.id)}
                  >
                    Approve
                  </Button>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        Deny
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Deny Appointment</DialogTitle>
                        <DialogDescription>
                          Please provide a reason for denying this appointment.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="denyReason">Reason for denial</Label>
                          <Textarea
                            id="denyReason"
                            placeholder="e.g., Schedule conflict, emergency case priority..."
                            value={denyReason}
                            onChange={(e) => setDenyReason(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDeny}
                            disabled={!denyReason.trim()}
                          >
                            Deny Appointment
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {/* Receptionist Actions */}
              {profile?.role === 'receptionist' && (
                <>
                  {appointment.status === 'pending' || appointment.status === 'denied' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => onEdit?.(appointment.id)}
                    >
                      Edit
                    </Button>
                  ) : appointment.status === 'approved' && isPastAppointment() ? (
                    <>
                      <Button
                        size="sm"
                        className="bg-success hover:bg-success/90 text-white"
                        onClick={() => onComplete?.(appointment.id)}
                      >
                        Completed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-500 text-gray-500 hover:bg-gray-500 hover:text-white"
                        onClick={() => onMissed?.(appointment.id)}
                      >
                        Missed
                      </Button>
                    </>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};