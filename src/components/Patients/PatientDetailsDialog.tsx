import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Phone, Heart, Calendar, FileText, Plus, Edit2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Patient } from "@/hooks/useAppointments";
import { format } from "date-fns";

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
  const [patientDetails, setPatientDetails] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
         payments (amount, payment_method, tests_done)
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

  if (!patientDetails) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              <span className="text-xl">{patientDetails.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleSavePatient}
                    disabled={loading}
                    className="bg-success hover:bg-success/90"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  {onDelete && (
                    <Button size="sm" variant="destructive" onClick={handleDeletePatient}>
                      Delete Patient
                    </Button>
                  )}
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Patient Details</TabsTrigger>
            <TabsTrigger value="history">Medical History</TabsTrigger>
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
                    <Label htmlFor="blood_type" className="text-foreground font-medium">Blood Type</Label>
                    <Input
                      id="blood_type"
                      value={patientDetails.blood_type || ""}
                      onChange={(e) => setPatientDetails({ ...patientDetails, blood_type: e.target.value })}
                      disabled={!isEditing}
                      placeholder="e.g., A+"
                      className="text-foreground"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-foreground">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_name" className="text-foreground font-medium">Contact Name</Label>
                    <Input
                      id="emergency_name"
                      value={patientDetails.emergency_contact_name || ""}
                      onChange={(e) => setPatientDetails({ ...patientDetails, emergency_contact_name: e.target.value })}
                      disabled={!isEditing}
                      className="text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_phone" className="text-foreground font-medium">Contact Phone</Label>
                    <Input
                      id="emergency_phone"
                      value={patientDetails.emergency_contact_phone || ""}
                      onChange={(e) =>
                        setPatientDetails({ ...patientDetails, emergency_contact_phone: e.target.value })
                      }
                      disabled={!isEditing}
                      className="text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insurance" className="text-foreground font-medium">Insurance Information</Label>
                    <Textarea
                      id="insurance"
                      value={patientDetails.insurance_info || ""}
                      onChange={(e) => setPatientDetails({ ...patientDetails, insurance_info: e.target.value })}
                      disabled={!isEditing}
                      className="text-foreground min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Medical Information */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span>Medical Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="allergies" className="text-foreground font-medium">Allergies</Label>
                  <Textarea
                    id="allergies"
                    value={patientDetails.allergies || ""}
                    onChange={(e) => setPatientDetails({ ...patientDetails, allergies: e.target.value })}
                    disabled={!isEditing}
                    placeholder="List any known allergies..."
                    className="text-foreground min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medications" className="text-foreground font-medium">Current Medications</Label>
                  <Textarea
                    id="medications"
                    value={patientDetails.current_medications || ""}
                    onChange={(e) => setPatientDetails({ ...patientDetails, current_medications: e.target.value })}
                    disabled={!isEditing}
                    placeholder="List current medications..."
                    className="text-foreground min-h-[80px]"
                  />
                </div>
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

          <TabsContent value="history" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Visit History</h3>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Visit
              </Button>
            </div>
            {visits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p>No visit history recorded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {visits.map((visit) => (
                  <Card key={visit.id} className="border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold text-foreground">
                          {format(new Date(visit.visit_date), "MMM dd, yyyy")}
                        </CardTitle>
                        {visit.follow_up_needed && (
                          <Badge variant="outline" className="bg-warning/10 text-warning">
                            Follow-up Required
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {visit.diagnosis && (
                        <div className="space-y-1">
                          <span className="font-medium text-foreground">Diagnosis</span>
                          <p className="text-foreground leading-relaxed">{visit.diagnosis}</p>
                        </div>
                      )}
                      {visit.treatment_plan && (
                        <div className="space-y-1">
                          <span className="font-medium text-foreground">Treatment</span>
                          <p className="text-foreground leading-relaxed">{visit.treatment_plan}</p>
                        </div>
                      )}
                      {visit.prescriptions && (
                        <div className="space-y-1">
                          <span className="font-medium text-foreground">Prescriptions</span>
                          <p className="text-foreground leading-relaxed">{visit.prescriptions}</p>
                        </div>
                      )}
                      {visit.visit_notes && (
                        <div className="space-y-1">
                          <span className="font-medium text-foreground">Notes</span>
                          <p className="text-foreground leading-relaxed">{visit.visit_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
                                  <span className="font-medium text-foreground">Amount: ₹{payment.amount}</span>
                                  <Badge variant="outline" className="text-xs">{payment.payment_method}</Badge>
                                </div>
                                {payment.tests_done && (
                                  <div className="text-sm text-foreground">
                                    <span className="font-medium">Tests Done:</span> {payment.tests_done}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
