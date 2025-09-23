import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, User, FileText, Phone, Stethoscope, AlertCircle, Edit, CreditCard, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Appointment } from '@/hooks/useAppointments';
import { PatientDetailsDialog } from '@/components/Patients/PatientDetailsDialog';
import { EditAppointmentDialog } from '@/components/Appointments/EditAppointmentDialog';
import { PaymentDialog } from '@/components/Payments/PaymentDialog';

interface AppointmentCardProps {
  appointment: Appointment;
  onApprove?: (appointmentId: string) => void;
  onDeny?: (appointmentId: string, reason: string) => void;
  onEdit?: (appointmentId: string) => void;
  onComplete?: (appointmentId: string) => void;
  onMissed?: (appointmentId: string) => void;
  onPaymentSuccess?: () => void;
  showActions?: boolean;
}

export const AppointmentCard = ({
  appointment,
  onApprove,
  onDeny,
  onEdit,
  onComplete,
  onMissed,
  onPaymentSuccess,
  showActions = true,
}: AppointmentCardProps) => {
  const [denyReason, setDenyReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
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

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleComplete = () => {
    setPaymentDialogOpen(true);
  };

  const handleMissed = () => {
    if (onMissed) {
      onMissed(appointment.id);
    }
  };

  const handlePaymentSuccess = () => {
    if (onComplete) {
      onComplete(appointment.id);
    }
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Card className="smooth-hover hover:shadow-card-hover border-l-4 border-l-primary/30 cursor-pointer animate-fade-in">
            <CardHeader className="pb-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 
                    className="font-bold text-medical-dark text-xl truncate cursor-pointer hover:text-primary smooth-transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPatientDialogOpen(true);
                    }}
                  >
                    {appointment.patients?.name}
                  </h3>
                  <Badge variant="outline" className={`${getStatusColor(appointment.status)} text-xs smooth-transition`}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(appointment.appointment_date), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{appointment.appointment_time}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm font-medium text-medical-dark">
                    Age: {appointment.patients?.age}
                  </div>
                </div>

                {showActions && (
                  <div className="flex items-center space-x-1 pt-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    {/* Doctor Actions */}
                    {profile?.role === 'doctor' && appointment.status === 'pending' && (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-white text-xs px-2 py-1 h-6 smooth-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApprove?.(appointment.id);
                          }}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="text-xs px-2 py-1 h-6 smooth-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsDialogOpen(true);
                          }}
                        >
                          Deny
                        </Button>
                      </div>
                    )}

                    {/* Receptionist Actions */}
                    {profile?.role === 'receptionist' && (
                      <div className="flex space-x-1">
                        {(appointment.status === 'pending' || appointment.status === 'approved') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs px-2 py-1 h-6 smooth-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit();
                            }}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        )}
                        {appointment.status === 'approved' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90 text-white text-xs px-2 py-1 h-6 smooth-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleComplete();
                              }}
                            >
                              <CreditCard className="w-3 h-3 mr-1" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs px-2 py-1 h-6 smooth-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMissed();
                              }}
                            >
                              <UserX className="w-3 h-3 mr-1" />
                              Missed
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl animate-scale-in">
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

      {/* Deny Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="animate-scale-in">
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
      
      {/* Patient Details Dialog */}
      <PatientDetailsDialog
        patient={appointment.patients || null}
        open={patientDialogOpen}
        onOpenChange={setPatientDialogOpen}
      />
      
      {/* Edit Appointment Dialog */}
      <EditAppointmentDialog
        appointment={appointment}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => window.location.reload()}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        appointmentId={appointment.id}
        patientName={appointment.patients?.name || 'Patient'}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
};