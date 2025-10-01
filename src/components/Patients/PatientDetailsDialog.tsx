import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Phone, Heart, Calendar, FileText, Plus, Edit2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Patient } from '@/hooks/useAppointments';
import { format } from 'date-fns';

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

interface ExtendedPatient extends Patient {
  allergies?: string;
  current_medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_info?: string;
  blood_type?: string;
}

export const PatientDetailsDialog = ({ patient, open, onOpenChange, onDelete }: PatientDetailsDialogProps) => {
  const [patientDetails, setPatientDetails] = useState<ExtendedPatient | null>(null);
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (patient && open) {
      fetchPatientDetails();
      fetchPatientVisits();
      fetchPatientAppointments();
    }
  }, [patient, open]);

  const fetchPatientDetails = async () => {
    if (!patient) return;
    
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patient.id)
        .single();

      if (error) throw error;
      setPatientDetails(data);
    } catch (error) {
      console.error('Error fetching patient details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch patient details',
        variant: 'destructive',
      });
    }
  };

  const fetchPatientVisits = async () => {
    if (!patient) return;
    
    try {
      const { data, error } = await supabase
        .from('patient_visits')
        .select('*')
        .eq('patient_id', patient.id)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching patient visits:', error);
    }
  };

  const fetchPatientAppointments = async () => {
    if (!patient) return;
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor_profile:profiles!appointments_doctor_id_fkey (name),
          payments (amount, payment_method, tests_done)
        `)
        .eq('patient_id', patient.id)
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching patient appointments:', error);
    }
  };

  const handleSavePatient = async () => {
    if (!patientDetails) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          name: patientDetails.name,
          age: patientDetails.age,
          contact_no: patientDetails.contact_no,
          medical_history: patientDetails.medical_history,
          allergies: patientDetails.allergies,
          current_medications: patientDetails.current_medications,
          emergency_contact_name: patientDetails.emergency_contact_name,
          emergency_contact_phone: patientDetails.emergency_contact_phone,
          insurance_info: patientDetails.insurance_info,
          blood_type: patientDetails.blood_type,
        })
        .eq('id', patientDetails.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Patient details updated successfully',
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating patient:', error);
      toast({
        title: 'Error',
        description: 'Failed to update patient details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!patientDetails || !window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientDetails.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Patient deleted successfully',
      });
      
      onDelete?.(patientDetails.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete patient',
        variant: 'destructive',
      });
    }
  };

  if (!patientDetails) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-primary" />
              <span>{patientDetails.name} - Medical Record</span>
            </div>
            <div className="flex items-center space-x-2">
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDeletePatient}
                    >
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

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={patientDetails.name}
                        onChange={(e) => setPatientDetails({ ...patientDetails, name: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={patientDetails.age}
                        onChange={(e) => setPatientDetails({ ...patientDetails, age: parseInt(e.target.value) })}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contact">Contact Number</Label>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <Input
                        id="contact"
                        value={patientDetails.contact_no}
                        onChange={(e) => setPatientDetails({ ...patientDetails, contact_no: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="blood_type">Blood Type</Label>
                    <Input
                      id="blood_type"
                      value={patientDetails.blood_type || ''}
                      onChange={(e) => setPatientDetails({ ...patientDetails, blood_type: e.target.value })}
                      disabled={!isEditing}
                      placeholder="e.g., A+"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="emergency_name">Contact Name</Label>
                    <Input
                      id="emergency_name"
                      value={patientDetails.emergency_contact_name || ''}
                      onChange={(e) => setPatientDetails({ ...patientDetails, emergency_contact_name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_phone">Contact Phone</Label>
                    <Input
                      id="emergency_phone"
                      value={patientDetails.emergency_contact_phone || ''}
                      onChange={(e) => setPatientDetails({ ...patientDetails, emergency_contact_phone: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="insurance">Insurance Information</Label>
                    <Textarea
                      id="insurance"
                      value={patientDetails.insurance_info || ''}
                      onChange={(e) => setPatientDetails({ ...patientDetails, insurance_info: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Medical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span>Medical Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    value={patientDetails.allergies || ''}
                    onChange={(e) => setPatientDetails({ ...patientDetails, allergies: e.target.value })}
                    disabled={!isEditing}
                    placeholder="List any known allergies..."
                  />
                </div>
                <div>
                  <Label htmlFor="medications">Current Medications</Label>
                  <Textarea
                    id="medications"
                    value={patientDetails.current_medications || ''}
                    onChange={(e) => setPatientDetails({ ...patientDetails, current_medications: e.target.value })}
                    disabled={!isEditing}
                    placeholder="List current medications..."
                  />
                </div>
                <div>
                  <Label htmlFor="medical_history">Medical History</Label>
                  <Textarea
                    id="medical_history"
                    value={patientDetails.medical_history || ''}
                    onChange={(e) => setPatientDetails({ ...patientDetails, medical_history: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Medical history and conditions..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Visit History</h3>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Visit
              </Button>
            </div>
            {visits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No visit history recorded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {visits.map((visit) => (
                  <Card key={visit.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          Visit - {format(new Date(visit.visit_date), 'MMM dd, yyyy')}
                        </CardTitle>
                        {visit.follow_up_needed && (
                          <Badge variant="outline" className="bg-warning/10 text-warning">
                            Follow-up Required
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {visit.diagnosis && (
                        <div>
                          <span className="font-medium">Diagnosis:</span>
                          <p className="text-muted-foreground">{visit.diagnosis}</p>
                        </div>
                      )}
                      {visit.treatment_plan && (
                        <div>
                          <span className="font-medium">Treatment:</span>
                          <p className="text-muted-foreground">{visit.treatment_plan}</p>
                        </div>
                      )}
                      {visit.prescriptions && (
                        <div>
                          <span className="font-medium">Prescriptions:</span>
                          <p className="text-muted-foreground">{visit.prescriptions}</p>
                        </div>
                      )}
                      {visit.visit_notes && (
                        <div>
                          <span className="font-medium">Notes:</span>
                          <p className="text-muted-foreground">{visit.visit_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <h3 className="text-lg font-semibold">Appointment History</h3>
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No appointments found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <Card key={appointment.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {format(new Date(appointment.appointment_date), 'MMM dd, yyyy')} at {appointment.appointment_time}
                        </CardTitle>
                        <Badge 
                          variant="outline" 
                          className={
                            appointment.status === 'completed' ? 'bg-success/10 text-success' :
                            appointment.status === 'approved' ? 'bg-primary/10 text-primary' :
                            appointment.status === 'pending' ? 'bg-warning/10 text-warning' :
                            'bg-destructive/10 text-destructive'
                          }
                        >
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <span className="font-medium">Doctor:</span> Dr. {appointment.doctor_profile?.name}
                      </div>
                      {appointment.reason_for_visit && (
                        <div>
                          <span className="font-medium">Reason:</span> {appointment.reason_for_visit}
                        </div>
                      )}
                      {appointment.symptoms && (
                        <div>
                          <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                        </div>
                      )}
                      {appointment.payments && appointment.payments.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-medium">Payment Details:</span>
                          {appointment.payments.map((payment: any, index: number) => (
                            <div key={index} className="text-sm text-muted-foreground pl-4">
                              <div>Amount: ${payment.amount} ({payment.payment_method})</div>
                              {payment.tests_done && <div>Tests: {payment.tests_done}</div>}
                            </div>
                          ))}
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