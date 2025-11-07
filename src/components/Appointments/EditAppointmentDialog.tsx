import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Edit, Calendar, Clock, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppointments, Appointment } from '@/hooks/useAppointments';

const editAppointmentSchema = z.object({
  patientName: z.string().min(1, 'Please enter patient name'),
  patientAge: z.number().min(1, 'Please enter patient age').max(150, 'Invalid age'),
  contactNo: z.string().min(10, 'Please enter a valid contact number'),
  doctorId: z.string().min(1, 'Please select a doctor'),
  appointmentDate: z.string().min(1, 'Please select a date'),
  appointmentTime: z.string().min(1, 'Please select a time'),
  reasonForVisit: z.string().optional(),
  symptoms: z.string().optional(),
});

type EditAppointmentFormData = z.infer<typeof editAppointmentSchema>;

interface EditAppointmentDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const EditAppointmentDialog = ({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}: EditAppointmentDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { doctors, updateAppointment } = useAppointments();

  const form = useForm<EditAppointmentFormData>({
    resolver: zodResolver(editAppointmentSchema),
  });

  useEffect(() => {
    if (appointment) {
      form.reset({
        patientName: appointment.patients?.name || '',
        patientAge: appointment.patients?.age || 0,
        contactNo: appointment.patients?.contact_no || '',
        doctorId: appointment.doctor_id,
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time,
        reasonForVisit: appointment.reason_for_visit || '',
        symptoms: appointment.symptoms || '',
      });
    }
  }, [appointment, form]);

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  ];

  const onSubmit = async (data: EditAppointmentFormData) => {
    if (!appointment) return;
    
    setIsLoading(true);
    
    try {
      // Check if timing changed
      const timingChanged = 
        data.appointmentDate !== appointment.appointment_date ||
        data.appointmentTime !== appointment.appointment_time;

      await updateAppointment(
        appointment.id,
        {
          patient_id: appointment.patient_id,
          patient_name: data.patientName,
          patient_age: data.patientAge,
          contact_no: data.contactNo,
          doctor_id: data.doctorId,
          appointment_date: data.appointmentDate,
          appointment_time: data.appointmentTime,
          reason_for_visit: data.reasonForVisit,
          symptoms: data.symptoms,
        },
        timingChanged
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating appointment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="w-5 h-5 text-primary" />
            <span>Edit Appointment</span>
          </DialogTitle>
          <DialogDescription>
            Update appointment details for {appointment.patients?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patientName">Patient Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="patientName"
                  className="pl-10"
                  autoComplete="off"
                  {...form.register('patientName')}
                />
              </div>
              {form.formState.errors.patientName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.patientName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientAge">Age</Label>
                <Input
                  id="patientAge"
                  type="number"
                  autoComplete="off"
                  {...form.register('patientAge', { valueAsNumber: true })}
                />
                {form.formState.errors.patientAge && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.patientAge.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNo">Contact Number</Label>
                <Input
                  id="contactNo"
                  type="tel"
                  autoComplete="off"
                  {...form.register('contactNo')}
                />
                {form.formState.errors.contactNo && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.contactNo.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select onValueChange={(value) => form.setValue('doctorId', value)} defaultValue={appointment.doctor_id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.user_id} value={doctor.user_id}>
                      {doctor.name}
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

            <div className="space-y-2">
              <Label htmlFor="appointmentDate">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="appointmentDate"
                  type="date"
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                  autoComplete="off"
                  {...form.register('appointmentDate')}
                />
              </div>
              {form.formState.errors.appointmentDate && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.appointmentDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Time Slot</Label>
            <Select onValueChange={(value) => form.setValue('appointmentTime', value)} defaultValue={appointment.appointment_time}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
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

          <div className="space-y-2">
            <Label htmlFor="reasonForVisit">Reason for Visit</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="reasonForVisit"
                className="pl-10"
                autoComplete="off"
                {...form.register('reasonForVisit')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="symptoms">Symptoms</Label>
            <Textarea
              id="symptoms"
              autoComplete="off"
              {...form.register('symptoms')}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-primary to-medical-blue hover:from-primary-hover hover:to-primary text-primary-foreground"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Appointment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};