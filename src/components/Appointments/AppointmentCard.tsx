import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  User,
  FileText,
  Phone,
  Stethoscope,
  AlertCircle,
  Edit,
  CreditCard,
  UserX,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Appointment } from "@/hooks/useAppointments";
import { PatientDetailsDialog } from "@/components/Patients/PatientDetailsDialog";
import { EditAppointmentDialog } from "@/components/Appointments/EditAppointmentDialog";
import { PaymentDialog } from "@/components/Payments/PaymentDialog";

interface AppointmentCardProps {
  appointment: Appointment;
  onApprove?: (appointmentId: string) => void;
  onDeny?: (appointmentId: string, reason: string) => void;
  onEdit?: (appointmentId: string) => void;
  onComplete?: (appointmentId: string) => void;
  onMissed?: (appointmentId: string) => void;
  onDelete?: (appointmentId: string) => void;
  onPaymentSuccess?: () => void;
  showActions?: boolean;
  isTranslucent?: boolean;
}

export const AppointmentCard = ({
  appointment,
  onApprove,
  onDeny,
  onEdit,
  onComplete,
  onMissed,
  onDelete,
  onPaymentSuccess,
  showActions = true,
  isTranslucent = false,
}: AppointmentCardProps) => {
  const [denyReason, setDenyReason] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning/10 text-warning border-warning/20";
      case "approved":
        return "bg-success/10 text-success border-success/20";
      case "denied":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "completed":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "missed":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const handleDeny = () => {
    if (denyReason.trim() && onDeny) {
      onDeny(appointment.id, denyReason);
      setDenyReason("");
      setIsDialogOpen(false);
    }
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  // Check if appointment date is in the past
  const isAppointmentPast = () => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const now = new Date();
    return appointmentDateTime < now;
  };

  const handleComplete = () => {
    // If appointment doesn't require payment, complete directly
    if (appointment.requires_payment === false) {
      // Update appointment status to completed directly
      const completeWithoutPayment = async () => {
        try {
          const { error } = await supabase
            .from('appointments')
            .update({ status: 'completed' })
            .eq('id', appointment.id);

          if (error) throw error;

          toast({
            title: 'Success',
            description: 'Appointment completed without payment',
          });

          if (onComplete) {
            onComplete(appointment.id);
          }
          if (onPaymentSuccess) {
            onPaymentSuccess();
          }
        } catch (error) {
          console.error('Error completing appointment:', error);
          toast({
            title: 'Error',
            description: 'Failed to complete appointment',
            variant: 'destructive',
          });
        }
      };
      completeWithoutPayment();
    } else {
      setPaymentDialogOpen(true);
    }
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
          <Card
            className={`smooth-hover hover:shadow-lg border-l-4 ${
              appointment.status === "approved"
                ? "border-l-success"
                : appointment.status === "denied"
                  ? "border-l-destructive"
                  : "border-l-primary"
            } cursor-pointer animate-fade-in transition-all duration-150 ${isTranslucent ? "opacity-60" : ""}`}
          >
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-5 pt-3 sm:pt-4">
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <h3
                    className="font-bold text-foreground text-sm sm:text-base leading-tight cursor-pointer hover:text-primary smooth-transition line-clamp-2 flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPatientDialogOpen(true);
                    }}
                  >
                    {appointment.patients?.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`${getStatusColor(appointment.status)} text-[9px] sm:text-xs smooth-transition px-1.5 sm:px-2.5 py-0.5 sm:py-1 font-semibold whitespace-nowrap shrink-0 rounded-md`}
                  >
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/40 px-2 py-1 rounded-md">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium whitespace-nowrap text-[11px] sm:text-xs">
                        {format(new Date(appointment.appointment_date), "MMM dd")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/40 px-2 py-1 rounded-md">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium whitespace-nowrap text-[11px] sm:text-xs">{appointment.appointment_time}</span>
                    </div>
                  </div>

                  <div className="text-[10px] sm:text-xs font-semibold text-foreground bg-primary/10 border border-primary/20 px-2 sm:px-2.5 py-1 rounded-md whitespace-nowrap">
                    Age: {appointment.patients?.age}
                  </div>
                </div>

                {showActions && (
                  <div
                    className="flex items-center pt-2 animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Doctor Actions */}
                    {profile?.role === "doctor" && appointment.status === "pending" && (
                      <div className="flex gap-1 w-full">
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-white text-[10px] sm:text-xs px-2 py-1 h-7 sm:h-8 smooth-button flex-1"
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
                          className="text-[10px] sm:text-xs px-2 py-1 h-7 sm:h-8 smooth-button flex-1"
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
                    {profile?.role === "receptionist" && (
                      <div className="flex flex-col gap-1 w-full">
                        {(appointment.status === "pending" || appointment.status === "approved") && (
                          <div className="flex gap-1 w-full">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 h-7 sm:h-8 smooth-button flex-1 min-w-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit();
                              }}
                            >
                              <Edit className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 h-7 sm:h-8 smooth-button flex-1 min-w-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(appointment.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          </div>
                        )}
                        {appointment.status === "approved" && (
                          <div className="flex gap-1 w-full">
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 h-7 sm:h-8 smooth-button flex-1 min-w-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleComplete();
                              }}
                            >
                              <CreditCard className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Complete</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 h-7 sm:h-8 smooth-button flex-1 min-w-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMissed();
                              }}
                            >
                              <UserX className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Missed</span>
                            </Button>
                          </div>
                        )}
                        {/* Past appointments - Edit and Delete */}
                        {(appointment.status === "completed" || appointment.status === "missed") && (
                          <div className="flex gap-1 w-full">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="border border-border/50 text-muted-foreground hover:bg-muted/30 hover:text-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 h-7 sm:h-8 smooth-button flex-1 min-w-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit();
                              }}
                            >
                              <Edit className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="border border-border/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 h-7 sm:h-8 smooth-button flex-1 min-w-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(appointment.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>
        </DialogTrigger>

        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <span className="truncate">Appointment Details</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 sm:space-y-6">
            {/* Patient Information */}
            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-semibold text-foreground border-b pb-2">Patient Information</h3>
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="font-medium text-foreground min-w-[90px] sm:min-w-[120px] text-xs sm:text-sm shrink-0">Name</span>
                  <span className="text-foreground text-xs sm:text-sm break-words">{appointment.patients?.name}</span>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="font-medium text-foreground min-w-[90px] sm:min-w-[120px] text-xs sm:text-sm shrink-0">Age</span>
                  <span className="text-foreground text-xs sm:text-sm">{appointment.patients?.age} years</span>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm shrink-0">Contact</span>
                  <span className="text-foreground text-xs sm:text-sm break-all">{appointment.patients?.contact_no}</span>
                </div>
                {appointment.patients?.medical_history && (
                  <div className="flex items-start gap-2 sm:gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <span className="font-medium text-foreground min-w-[90px] sm:min-w-[120px] text-xs sm:text-sm shrink-0">Medical History</span>
                    <p className="text-foreground flex-1 leading-relaxed text-xs sm:text-sm break-words">{appointment.patients.medical_history}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Appointment Information */}
            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-semibold text-foreground border-b pb-2">Appointment Information</h3>
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm shrink-0">Doctor</span>
                  <span className="text-foreground text-xs sm:text-sm break-words">{appointment.doctor_profile?.name}</span>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm shrink-0">Receptionist</span>
                  <span className="text-foreground text-xs sm:text-sm break-words">{appointment.receptionist_profile?.name}</span>
                </div>
                {appointment.reason_for_visit && (
                  <div className="flex items-start gap-2 sm:gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <span className="font-medium text-foreground min-w-[90px] sm:min-w-[120px] text-xs sm:text-sm shrink-0">Reason for Visit</span>
                    <p className="text-foreground flex-1 leading-relaxed text-xs sm:text-sm break-words">{appointment.reason_for_visit}</p>
                  </div>
                )}
                {appointment.symptoms && (
                  <div className="flex items-start gap-2 sm:gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <span className="font-medium text-foreground min-w-[90px] sm:min-w-[120px] text-xs sm:text-sm shrink-0">Symptoms</span>
                    <p className="text-foreground flex-1 leading-relaxed text-xs sm:text-sm break-words">{appointment.symptoms}</p>
                  </div>
                )}
                {appointment.denial_reason && (
                  <div className="flex items-start gap-2 sm:gap-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                    <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 text-destructive flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-destructive block mb-1 text-xs sm:text-sm">Denial Reason</span>
                      <p className="text-destructive leading-relaxed text-xs sm:text-sm break-words">{appointment.denial_reason}</p>
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
            <DialogDescription>Please provide a reason for denying this appointment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="denyReason">Reason for denial</Label>
              <Textarea id="denyReason" value={denyReason} onChange={(e) => setDenyReason(e.target.value)} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeny} disabled={!denyReason.trim()}>
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
        onDelete={(patientId) => {
          // Refresh page after patient deletion
          window.location.reload();
        }}
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
        patientName={appointment.patients?.name || "Patient"}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
};
