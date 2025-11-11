import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, User, FileText, Stethoscope } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimeSlotPicker } from "@/components/ui/time-slot-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppointments } from "@/hooks/useAppointments";
import { useToast } from "@/hooks/use-toast";

const appointmentSchema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  patientAge: z.number().min(1, "Age must be at least 1").max(150, "Age must be less than 150"),
  contactNo: z.string().min(10, "Contact number must be at least 10 digits"),
  medicalHistory: z.string().optional(),
  doctorId: z.string().min(1, "Please select a doctor"),
  appointmentDate: z.date({ required_error: "Please select a date" }),
  appointmentTime: z.string().min(1, "Please select a time"),
  reasonForVisit: z.string().optional(),
  symptoms: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  onSuccess?: () => void;
}

export const AppointmentForm = ({ onSuccess }: AppointmentFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [appointmentType, setAppointmentType] = useState<"new" | "repeat">("new");
  const [previousAppointments, setPreviousAppointments] = useState<any[]>([]);
  const [selectedPreviousAppointment, setSelectedPreviousAppointment] = useState<string>("");
  const [requiresPayment, setRequiresPayment] = useState(true);
  const [formData, setFormData] = useState({
    patientName: "",
    patientAge: "",
    contactNo: "",
    medicalHistory: "",
    doctorId: "",
    reasonForVisit: "",
    symptoms: "",
  });
  const { doctors, createAppointment, upsertPatient, searchPatientByName } = useAppointments();
  const { toast } = useToast();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
  });

  // Auto-fill patient details when name is entered
  const handlePatientNameBlur = useCallback(
    async (name: string) => {
      if (name.trim()) {
        const existingPatient = await searchPatientByName(name.trim());
        if (existingPatient) {
          form.setValue("patientAge", existingPatient.age);
          form.setValue("contactNo", existingPatient.contact_no);
          form.setValue("medicalHistory", existingPatient.medical_history || "");
          setFormData((prev) => ({
            ...prev,
            patientName: existingPatient.name,
            patientAge: existingPatient.age.toString(),
            contactNo: existingPatient.contact_no,
            medicalHistory: existingPatient.medical_history || "",
          }));

          // If repeat appointment, fetch previous appointments by patient_id, name+age, or contact
          if (appointmentType === "repeat") {
            // First try by patient_id
            let { data, error } = await supabase
              .from("appointments")
              .select("id, appointment_date, appointment_time, reason_for_visit, symptoms, patient_id")
              .eq("patient_id", existingPatient.id)
              .order("appointment_date", { ascending: false });

            // If no results, search by name and age combination
            if (!data || data.length === 0) {
              const { data: byNameAge } = await supabase
                .from("appointments")
                .select(
                  `
                  id, appointment_date, appointment_time, reason_for_visit, symptoms, patient_id,
                  patients!inner(id, name, age)
                `,
                )
                .eq("patients.name", existingPatient.name)
                .eq("patients.age", existingPatient.age)
                .order("appointment_date", { ascending: false });

              data = byNameAge;
            }

            // If still no results, search by contact number
            if (!data || data.length === 0) {
              const { data: byContact } = await supabase
                .from("appointments")
                .select(
                  `
                  id, appointment_date, appointment_time, reason_for_visit, symptoms, patient_id,
                  patients!inner(id, contact_no)
                `,
                )
                .eq("patients.contact_no", existingPatient.contact_no)
                .order("appointment_date", { ascending: false });

              data = byContact;
            }

            setPreviousAppointments(data || []);
          }
        }
      }
    },
    [form, searchPatientByName, appointmentType],
  );

  const onSubmit = async (data: AppointmentFormData) => {
    setIsLoading(true);

    try {
      // First, create or update the patient
      const patient = await upsertPatient({
        name: data.patientName,
        age: data.patientAge,
        contact_no: data.contactNo,
        medical_history: data.medicalHistory,
      });

      const appointmentDate = format(data.appointmentDate, "yyyy-MM-dd");
      const selectedTime = data.appointmentTime;
      
      // Calculate base slot time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const isUnlimited = hours >= 19; // After 7:00 PM is unlimited
      
      const totalMinutes = hours * 60 + minutes;
      const slotMinutes = Math.floor(totalMinutes / 15) * 15; // Round down to nearest 15-min slot
      const slotHours = Math.floor(slotMinutes / 60);
      const slotMins = slotMinutes % 60;
      const baseSlotTime = `${String(slotHours).padStart(2, '0')}:${String(slotMins).padStart(2, '0')}`;
      
      // Check existing appointments in this slot for this doctor and date
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('doctor_id', data.doctorId)
        .eq('appointment_date', appointmentDate)
        .gte('appointment_time', baseSlotTime)
        .lt('appointment_time', `${String(slotHours).padStart(2, '0')}:${String(slotMins + 15).padStart(2, '0')}`);
      
      if (checkError) {
        throw checkError;
      }
      
      const slotCount = existingAppointments?.length || 0;
      
      // Validate slot availability (max 3 per 15-min slot, unlimited after 7:00 PM)
      if (!isUnlimited && slotCount >= 3) {
        form.setError('appointmentTime', {
          type: 'manual',
          message: `This time slot is fully booked (3/3 appointments). Please select a different time.`
        });
        setIsLoading(false);
        return;
      }
      
      // Calculate actual appointment time based on slot position (5-minute intervals)
      const offsetMinutes = slotCount * 5;
      const actualMinutes = slotMinutes + offsetMinutes;
      const actualHours = Math.floor(actualMinutes / 60);
      const actualMins = actualMinutes % 60;
      const appointmentTime = `${String(actualHours).padStart(2, '0')}:${String(actualMins).padStart(2, '0')}`;
      
      console.log(`Slot: ${baseSlotTime}, Actual time: ${appointmentTime}`);

      // Then create the appointment, passing isWalkIn flag
      // Ensure repeat appointments use the SAME patient_id as previous ones
      let finalPatientId = patient.id;
      if (appointmentType === "repeat") {
        const selected = previousAppointments.find((a) => a.id === selectedPreviousAppointment);
        if (selected?.patient_id) {
          finalPatientId = selected.patient_id;
        } else if (previousAppointments.length > 0 && previousAppointments[0]?.patient_id) {
          finalPatientId = previousAppointments[0].patient_id;
        }
      }

      const appointmentData: any = {
        patient_id: finalPatientId,
        patient_name: data.patientName,
        doctor_id: data.doctorId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        reason_for_visit: data.reasonForVisit,
        symptoms: data.symptoms,
        isWalkIn: isWalkIn,
        is_repeat: appointmentType === "repeat",
        previous_appointment_id: appointmentType === "repeat" ? selectedPreviousAppointment || null : null,
        requires_payment: requiresPayment,
      };

      await createAppointment(appointmentData);

      // Show local notification as confirmation
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New Appointment Created", {
          body: `Appointment for ${data.patientName} has been scheduled`,
          icon: "/favicon.ico",
        });
      }

      // Reset form but keep form data for future use
      setFormData({
        patientName: data.patientName,
        patientAge: data.patientAge.toString(),
        contactNo: data.contactNo,
        medicalHistory: data.medicalHistory || "",
        doctorId: data.doctorId,
        reasonForVisit: data.reasonForVisit || "",
        symptoms: data.symptoms || "",
      });
      form.reset();
      setIsWalkIn(false);
      setAppointmentType("new");
      setPreviousAppointments([]);
      setSelectedPreviousAppointment("");
      onSuccess?.();
    } catch (error) {
      console.error("Error creating appointment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="w-5 h-5 text-primary" />
          <span>New Appointment</span>
        </CardTitle>
        <CardDescription>Enter patient details and schedule appointment</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Patient Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Patient Information</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Patient Name</Label>
                <Input
                  id="patientName"
                  defaultValue={formData.patientName}
                  autoComplete="off"
                  {...form.register("patientName")}
                  onBlur={(e) => handlePatientNameBlur(e.target.value)}
                />
                {form.formState.errors.patientName && (
                  <p className="text-sm text-destructive">{form.formState.errors.patientName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientAge">Age</Label>
                <Input
                  id="patientAge"
                  type="number"
                  defaultValue={formData.patientAge}
                  autoComplete="off"
                  {...form.register("patientAge", { valueAsNumber: true })}
                />
                {form.formState.errors.patientAge && (
                  <p className="text-sm text-destructive">{form.formState.errors.patientAge.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactNo">Contact Number</Label>
              <Input
                id="contactNo"
                defaultValue={formData.contactNo}
                autoComplete="off"
                {...form.register("contactNo")}
              />
              {form.formState.errors.contactNo && (
                <p className="text-sm text-destructive">{form.formState.errors.contactNo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicalHistory">Medical History</Label>
              <Textarea
                id="medicalHistory"
                defaultValue={formData.medicalHistory}
                autoComplete="off"
                {...form.register("medicalHistory")}
              />
            </div>
          </div>

          {/* Appointment Type Selection - Moved here */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox id="walkIn" checked={isWalkIn} onCheckedChange={(checked) => setIsWalkIn(checked as boolean)} />
              <Label htmlFor="walkIn" className="cursor-pointer font-medium">
                Walk-In Appointment
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Appointment Type</Label>
              <Select
                value={appointmentType}
                onValueChange={(v: "new" | "repeat") => {
                  setAppointmentType(v);
                  setPreviousAppointments([]);
                  setSelectedPreviousAppointment("");
                  // Trigger search if patient name is already filled
                  if (v === "repeat" && form.watch("patientName")) {
                    handlePatientNameBlur(form.watch("patientName"));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Appointment</SelectItem>
                  <SelectItem value="repeat">Repeat Appointment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {appointmentType === "repeat" && (
              <div className="flex items-center space-x-2 p-3 bg-accent/50 rounded-lg">
                <Checkbox
                  id="requires-payment"
                  checked={requiresPayment}
                  onCheckedChange={(checked) => setRequiresPayment(checked === true)}
                />
                <Label htmlFor="requires-payment" className="font-normal cursor-pointer">
                  Paying
                </Label>
              </div>
            )}

            {appointmentType === "repeat" && previousAppointments.length > 0 && (
              <div className="space-y-2 animate-fade-in">
                <Label>Previous Appointments</Label>
                <div className="max-h-48 overflow-y-auto border rounded-md bg-background">
                  {previousAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className={cn(
                        "p-3 cursor-pointer hover:bg-accent/50 transition-colors border-b last:border-b-0",
                        selectedPreviousAppointment === apt.id && "bg-primary/10 border-l-4 border-l-primary",
                      )}
                      onClick={() => {
                        setSelectedPreviousAppointment(apt.id);
                        // Auto-fill details from previous appointment
                        form.setValue("reasonForVisit", apt.reason_for_visit || "");
                        form.setValue("symptoms", apt.symptoms || "");
                      }}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <CalendarIcon className="w-3 h-3" />
                            {apt.appointment_date}
                            <span className="text-xs text-muted-foreground">at {apt.appointment_time}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {apt.reason_for_visit || "No reason specified"}
                          </div>
                          {apt.symptoms && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Symptoms:{" "}
                              {apt.symptoms.length > 60 ? apt.symptoms.substring(0, 60) + "..." : apt.symptoms}
                            </div>
                          )}
                        </div>
                        {selectedPreviousAppointment === apt.id && (
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click on a previous appointment to auto-fill reason and symptoms
                </p>
              </div>
            )}

            {appointmentType === "repeat" && form.watch("patientName") && previousAppointments.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No previous completed appointments found for this patient.
              </p>
            )}
          </div>

          {/* Appointment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4" />
              <span>Appointment Details</span>
            </h3>

            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select onValueChange={(value) => form.setValue("doctorId", value)} defaultValue={formData.doctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.user_id} value={doctor.user_id}>
                      <div className="flex items-center space-x-2">
                        <Stethoscope className="w-4 h-4" />
                        <span>{doctor.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.doctorId && (
                <p className="text-sm text-destructive">{form.formState.errors.doctorId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Appointment Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("appointmentDate") && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("appointmentDate") ? (
                        format(form.watch("appointmentDate"), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch("appointmentDate")}
                      onSelect={(date) => form.setValue("appointmentDate", date as Date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.appointmentDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.appointmentDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Appointment Time Slot</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("appointmentTime") && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("appointmentTime") || <span>Select time</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <TimeSlotPicker
                      value={form.watch("appointmentTime")}
                      onChange={(time) => form.setValue("appointmentTime", time)}
                      doctorId={form.watch("doctorId")}
                      appointmentDate={form.watch("appointmentDate")}
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.appointmentTime && (
                  <p className="text-sm text-destructive">{form.formState.errors.appointmentTime.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Visit Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Visit Details</span>
            </h3>

            <div className="space-y-2">
              <Label htmlFor="reasonForVisit">Reason for Visit</Label>
              <Textarea
                id="reasonForVisit"
                defaultValue={formData.reasonForVisit}
                placeholder="e.g., Regular checkup, follow-up consultation"
                autoComplete="off"
                {...form.register("reasonForVisit")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms</Label>
              <Textarea
                id="symptoms"
                defaultValue={formData.symptoms}
                placeholder="Describe any symptoms the patient is experiencing"
                autoComplete="off"
                {...form.register("symptoms")}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-medical-blue hover:from-primary-hover hover:to-primary text-primary-foreground"
            disabled={isLoading}
          >
            {isLoading ? "Creating Appointment..." : "Create Appointment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
