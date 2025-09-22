import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock, User, FileText, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAppointments } from '@/hooks/useAppointments';

const appointmentSchema = z.object({
  patientName: z.string().min(1, 'Patient name is required'),
  patientAge: z.number().min(1, 'Age must be at least 1').max(150, 'Age must be less than 150'),
  contactNo: z.string().min(10, 'Contact number must be at least 10 digits'),
  medicalHistory: z.string().optional(),
  doctorId: z.string().min(1, 'Please select a doctor'),
  appointmentDate: z.date({ required_error: 'Please select a date' }),
  appointmentTime: z.string().min(1, 'Please select a time'),
  reasonForVisit: z.string().optional(),
  symptoms: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  onSuccess?: () => void;
}

export const AppointmentForm = ({ onSuccess }: AppointmentFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    patientName: '',
    patientAge: '',
    contactNo: '',
    medicalHistory: '',
    doctorId: '',
    reasonForVisit: '',
    symptoms: ''
  });
  const { doctors, createAppointment, upsertPatient, searchPatientByName } = useAppointments();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
  });

  // Auto-fill patient details when name is entered
  const handlePatientNameBlur = useCallback(async (name: string) => {
    if (name.trim()) {
      const existingPatient = await searchPatientByName(name.trim());
      if (existingPatient) {
        form.setValue('patientAge', existingPatient.age);
        form.setValue('contactNo', existingPatient.contact_no);
        form.setValue('medicalHistory', existingPatient.medical_history || '');
        setFormData(prev => ({
          ...prev,
          patientName: existingPatient.name,
          patientAge: existingPatient.age.toString(),
          contactNo: existingPatient.contact_no,
          medicalHistory: existingPatient.medical_history || ''
        }));
      }
    }
  }, [form, searchPatientByName]);

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
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

      // Then create the appointment
      await createAppointment({
        patient_id: patient.id,
        doctor_id: data.doctorId,
        appointment_date: format(data.appointmentDate, 'yyyy-MM-dd'),
        appointment_time: data.appointmentTime,
        reason_for_visit: data.reasonForVisit,
        symptoms: data.symptoms,
      });

      // Reset form but keep form data for future use
      setFormData({
        patientName: data.patientName,
        patientAge: data.patientAge.toString(),
        contactNo: data.contactNo,
        medicalHistory: data.medicalHistory || '',
        doctorId: data.doctorId,
        reasonForVisit: data.reasonForVisit || '',
        symptoms: data.symptoms || ''
      });
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating appointment:', error);
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
        <CardDescription>
          Enter patient details and schedule appointment
        </CardDescription>
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
                  {...form.register('patientName')}
                  onBlur={(e) => handlePatientNameBlur(e.target.value)}
                />
                {form.formState.errors.patientName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.patientName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientAge">Age</Label>
                <Input
                  id="patientAge"
                  type="number"
                  defaultValue={formData.patientAge}
                  autoComplete="off"
                  {...form.register('patientAge', { valueAsNumber: true })}
                />
                {form.formState.errors.patientAge && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.patientAge.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactNo">Contact Number</Label>
              <Input
                id="contactNo"
                defaultValue={formData.contactNo}
                autoComplete="off"
                {...form.register('contactNo')}
              />
              {form.formState.errors.contactNo && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.contactNo.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicalHistory">Medical History</Label>
              <Textarea
                id="medicalHistory"
                defaultValue={formData.medicalHistory}
                autoComplete="off"
                {...form.register('medicalHistory')}
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
              <Select onValueChange={(value) => form.setValue('doctorId', value)} defaultValue={formData.doctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.user_id} value={doctor.user_id}>
                      <div className="flex items-center space-x-2">
                        <Stethoscope className="w-4 h-4" />
                        <span>Dr. {doctor.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.doctorId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.doctorId.message}
                </p>
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
                        !form.watch('appointmentDate') && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('appointmentDate') ? (
                        format(form.watch('appointmentDate'), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch('appointmentDate')}
                      onSelect={(date) => form.setValue('appointmentDate', date as Date)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.appointmentDate && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.appointmentDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Appointment Time</Label>
                <Select onValueChange={(value) => form.setValue('appointmentTime', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>{time}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.appointmentTime && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.appointmentTime.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reasonForVisit">Reason for Visit</Label>
              <Input
                id="reasonForVisit"
                defaultValue={formData.reasonForVisit}
                autoComplete="off"
                {...form.register('reasonForVisit')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms</Label>
              <Textarea
                id="symptoms"
                defaultValue={formData.symptoms}
                autoComplete="off"
                {...form.register('symptoms')}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-medical-blue hover:from-primary-hover hover:to-primary text-primary-foreground"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Appointment...' : 'Create Appointment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};