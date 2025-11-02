import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, User, FileText, Stethoscope } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimeWheelPicker } from "@/components/ui/time-wheel-picker";
import { ClockTimePicker } from "@/components/ui/clock-time-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppointments } from "@/hooks/useAppointments";

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
  const [appointmentType, setAppointmentType] = useState<'new' | 'repeat'>('new');
  const [previousAppointments, setPreviousAppointments] = useState<any[]>([]);
  const [selectedPreviousAppointment, setSelectedPreviousAppointment] = useState<string>('');
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

          // If repeat appointment, fetch previous appointments with same name or number
          if (appointmentType === 'repeat') {
            const { data } = await supabase
              .from("appointments")
              .select("*, patients(name, contact_no)")
              .or(`patient_id.eq.${existingPatient.id},patients.contact_no.eq.${existingPatient.contact_no}`)
              .eq("status", "completed")
              .order("appointment_date", { ascending: false });
            
            if (data) setPreviousAppointments(data);
          }
        }
      }
    },
    [form, searchPatientByName, appointmentType],
  );

  const timeSlots = [
    { value: "10:00", label: "10:00 AM" },
    { value: "10:30", label: "10:30 AM" },
    { value: "11:00", label: "11:00 AM" },
    { value: "11:30", label: "11:30 AM" },
    { value: "12:00", label: "12:00 PM" },
    { value: "12:30", label: "12:30 PM" },
    { value: "13:00", label: "1:00 PM" },
    { value: "13:30", label: "1:30 PM" },
    { value: "14:00", label: "2:00 PM" },
    { value: "14:30", label: "2:30 PM" },
    { value: "15:00", label: "3:00 PM" },
    { value: "15:30", label: "3:30 PM" },
    { value: "16:00", label: "4:00 PM" },
    { value: "16:30", label: "4:30 PM" },
    { value: "17:00", label: "5:00 PM" },
    { value: "17:30", label: "5:30 PM" },
    { value: "18:00", label: "6:00 PM" },
    { value: "18:30", label: "6:30 PM" },
    { value: "19:00", label: "7:00 PM" },
    { value: "19:30", label: "7:30 PM" },
    { value: "20:00", label: "8:00 PM" },
  ];

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
      const appointmentTime = data.appointmentTime;

      // Then create the appointment, passing isWalkIn flag
      const appointmentData: any = {
        patient_id: patient.id,
        patient_name: data.patientName,
        doctor_id: data.doctorId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        reason_for_visit: data.reasonForVisit,
        symptoms: data.symptoms,
        isWalkIn: isWalkIn,
        is_repeat: appointmentType === 'repeat',
        previous_appointment_id: appointmentType === 'repeat' ? selectedPreviousAppointment : null,
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
      setAppointmentType('new');
      setPreviousAppointments([]);
      setSelectedPreviousAppointment('');
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
          {/* Appointment Type Selection */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox id="walkIn" checked={isWalkIn} onCheckedChange={(checked) => setIsWalkIn(checked as boolean)} />
              <Label htmlFor="walkIn" className="cursor-pointer font-medium">
                Walk-In Appointment
              </Label>
            </div>
            
            <div className="space-y-2">
              <Label>Appointment Type</Label>
              <Select value={appointmentType} onValueChange={(v: 'new' | 'repeat') => {
                setAppointmentType(v);
                setPreviousAppointments([]);
                setSelectedPreviousAppointment('');
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Appointment</SelectItem>
                  <SelectItem value="repeat">Repeat Appointment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {appointmentType === 'repeat' && previousAppointments.length > 0 && (
              <div className="space-y-2">
                <Label>Previous Appointments</Label>
                <div className="max-h-32 overflow-y-auto border rounded-md">
                  {previousAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className={cn(
                        "p-2 cursor-pointer hover:bg-accent/50 transition-colors border-b last:border-b-0",
                        selectedPreviousAppointment === apt.id && "bg-primary/10 border-l-4 border-l-primary"
                      )}
                      onClick={() => {
                        setSelectedPreviousAppointment(apt.id);
                        // Auto-fill details from previous appointment
                        form.setValue("reasonForVisit", apt.reason_for_visit || "");
                        form.setValue("symptoms", apt.symptoms || "");
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{apt.appointment_date}</div>
                          <div className="text-xs text-muted-foreground">
                            {apt.reason_for_visit || 'No reason specified'}
                          </div>
                          {apt.symptoms && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Symptoms: {apt.symptoms.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                        {selectedPreviousAppointment === apt.id && (
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select a previous appointment to auto-fill details
                </p>
              </div>
            )}
          </div>

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
                <Label>Appointment Time</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("appointmentTime") && "text-muted-foreground",
                      )}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {form.watch("appointmentTime") ? (
                        (() => {
                          const time = form.watch("appointmentTime");
                          const [hours, mins] = time.split(":").map(Number);
                          const hour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
                          const period = hours >= 12 ? "PM" : "AM";
                          return `${hour}:${String(mins).padStart(2, "0")} ${period}`;
                        })()
                      ) : (
                        <span>Select time</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <ClockTimePicker
                      value={form.watch("appointmentTime")}
                      onChange={(time) => form.setValue("appointmentTime", time)}
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.appointmentTime && (
                  <p className="text-sm text-destructive">{form.formState.errors.appointmentTime.message}</p>
                )}
              </div>
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
