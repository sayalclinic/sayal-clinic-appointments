import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Phone, Calendar, FileText, Edit2, Save, CreditCard, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Patient } from "@/hooks/useAppointments";
import { format } from "date-fns";
import { EditAppointmentDialog } from "@/components/Appointments/EditAppointmentDialog";
import { PaymentDialog } from "@/components/Payments/PaymentDialog";

interface PatientDetailsDialogProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (patientId: string) => void;
}

interface PatientVisit {
  id: string;
  visit_date: string;
  visit_notes?: string;
  diagnosis?: string;
  treatment_plan?: string;
  prescriptions?: string;
  follow_up_needed: boolean;
  follow_up_date?: string;
  appointment_id?: string;
}

// Using base Patient interface with only essential fields

export const PatientDetailsDialog = ({ patient, open, onOpenChange, onDelete }: PatientDetailsDialogProps) => {
  const { toast } = useToast();
  const [patientDetails, setPatientDetails] = useState<Patient | null>(null);
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  useEffect(() => {
    if (patient && open) {
      fetchPatientDetails();
      fetchPatientAppointments();
    }
  }, [patient, open]);

  const fetchPatientDetails = async () => {
    if (!patient) return;

    try {
      const { data, error } = await supabase.from("patients").select("*").eq("id", patient.id).single();

      if (error) throw error;
      setPatientDetails(data);
    } catch (error) {
      console.error("Error fetching patient details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch patient details",
        variant: "destructive",
      });
    }
  };

  // Removed visit fetching - not needed in simplified view

  const fetchPatientAppointments = async () => {
    if (!patient) return;

    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
         doctor_profile:profiles!doctor_id(name),
         payments (appointment_fee, test_payments, payment_method)
         `,
        )
        .eq("patient_id", patient.id)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching patient appointments:", error);
    }
  };

  const handleSavePatient = async () => {
    if (!patientDetails) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          name: patientDetails.name,
          age: patientDetails.age,
          contact_no: patientDetails.contact_no,
          medical_history: patientDetails.medical_history,
        })
        .eq("id", patientDetails.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Patient details updated successfully",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating patient:", error);
      toast({
        title: "Error",
        description: "Failed to update patient details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = async () => {
    if (
      !patientDetails ||
      !window.confirm("Are you sure you want to delete this patient? This action cannot be undone.")
    )
      return;

    try {
      const { error } = await supabase.from("patients").delete().eq("id", patientDetails.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Patient deleted successfully",
      });

      onDelete?.(patientDetails.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting patient:", error);
      toast({
        title: "Error",
        description: "Failed to delete patient",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase.from("appointments").delete().eq("id", appointmentId);
      if (error) throw error;
      toast({ title: "Deleted", description: "Appointment deleted" });
      fetchPatientAppointments();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast({ title: "Error", description: "Failed to delete appointment", variant: "destructive" });
    }
  };

  if (!patientDetails) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            <span className="text-xl">{patientDetails.name}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Patient Details</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-foreground">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-foreground font-medium">Name</Label>
                      <Input
                        id="name"
                        value={patientDetails.name}
                        onChange={(e) => setPatientDetails({ ...patientDetails, name: e.target.value })}
                        disabled={!isEditing}
                        className="text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age" className="text-foreground font-medium">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={patientDetails.age}
                        onChange={(e) => setPatientDetails({ ...patientDetails, age: parseInt(e.target.value) })}
                        disabled={!isEditing}
                        className="text-foreground"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact" className="text-foreground font-medium">Contact Number</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      <Input
                        id="contact"
                        value={patientDetails.contact_no}
                        onChange={(e) => setPatientDetails({ ...patientDetails, contact_no: e.target.value })}
                        disabled={!isEditing}
                        className="text-foreground flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Medical History (only field kept) */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-foreground">Medical History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="medical_history" className="text-foreground font-medium">Medical History</Label>
                  <Textarea
                    id="medical_history"
                    value={patientDetails.medical_history || ""}
                    onChange={(e) => setPatientDetails({ ...patientDetails, medical_history: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Medical history and conditions..."
                    rows={4}
                    className="text-foreground min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="appointments" className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground border-b pb-3">Appointment History</h3>
            {appointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p>No appointments found</p>
              </div>
            ) : (
              <div className="space-y-5">
                {appointments.map((appointment) => (
                  <Card key={appointment.id} className="border-border/50 shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          {format(new Date(appointment.appointment_date), "MMM dd, yyyy")} at{" "}
                          {appointment.appointment_time}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={
                            appointment.status === "completed"
                              ? "bg-success/10 text-success border-success/20"
                              : appointment.status === "approved"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : appointment.status === "pending"
                                  ? "bg-warning/10 text-warning border-warning/20"
                                  : "bg-destructive/10 text-destructive border-destructive/20"
                          }
                        >
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <User className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium text-foreground block mb-1">Doctor</span>
                            <span className="text-foreground">{appointment.doctor_profile?.name}</span>
                          </div>
                        </div>
                        
                        {appointment.reason_for_visit && (
                          <div className="flex items-start gap-3">
                            <FileText className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                            <div className="flex-1">
                              <span className="font-medium text-foreground block mb-1">Reason for Visit</span>
                              <span className="text-foreground">{appointment.reason_for_visit}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {appointment.symptoms && (
                        <div className="flex items-start gap-3 pt-2 border-t border-border/50">
                          <FileText className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium text-foreground block mb-1">Symptoms</span>
                            <p className="text-foreground leading-relaxed">{appointment.symptoms}</p>
                          </div>
                        </div>
                      )}

                      {appointment.denial_reason && (
                        <div className="flex items-start gap-3 p-3 bg-destructive/5 rounded-md border border-destructive/20">
                          <div className="flex-1">
                            <span className="font-medium text-destructive block mb-1">Denial Reason</span>
                            <p className="text-destructive leading-relaxed">{appointment.denial_reason}</p>
                          </div>
                        </div>
                      )}

                      {appointment.payments && appointment.payments.length > 0 && (
                        <div className="pt-2 border-t border-border/50">
                          <span className="font-medium text-foreground block mb-3">Payment Details</span>
                          <div className="space-y-3">
                            {appointment.payments.map((payment: any, index: number) => (
                              <div key={index} className="p-3 bg-muted/30 rounded-md border border-border/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-foreground">
                                    Amount: ₹{Number(payment.appointment_fee || 0) + 
                                      (Array.isArray(payment.test_payments) 
                                        ? payment.test_payments.reduce((sum: number, test: any) => sum + Number(test.amount || 0), 0) 
                                        : 0)}
                                  </span>
                                  <Badge variant="outline" className="text-xs">{payment.payment_method}</Badge>
                                </div>
                                {payment.test_payments && Array.isArray(payment.test_payments) && payment.test_payments.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    <span className="font-medium">Tests Done:</span> {payment.test_payments.map((t: any) => t.test_name).join(', ')}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-muted/40 text-muted-foreground hover:bg-muted/60"
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-muted/40 text-muted-foreground hover:bg-muted/60"
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setPaymentDialogOpen(true);
                          }}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Payment
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-muted/40 text-muted-foreground hover:bg-muted/60"
                          onClick={() => handleDeleteAppointment(appointment.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Patient Actions at Bottom */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t">
          {isEditing ? (
            <>
              <Button
                size="sm"
                onClick={handleSavePatient}
                disabled={loading}
                className="bg-success hover:bg-success/90"
              >
                <Save className="w-4 h-4 mr-1" />
                Save Changes
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-1" />
                Edit Patient
              </Button>
              {onDelete && (
                <Button size="sm" variant="destructive" onClick={handleDeletePatient}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Patient
                </Button>
              )}
            </>
          )}
        </div>

        {selectedAppointment && (
          <EditAppointmentDialog
            appointment={selectedAppointment}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={fetchPatientAppointments}
          />
        )}
        {selectedAppointment && (
          <PaymentDialog
            appointmentId={selectedAppointment.id}
            patientName={patientDetails.name}
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            onSuccess={fetchPatientAppointments}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
