import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { showNotification } from '@/utils/notifications';

export interface Patient {
  id: string;
  name: string;
  age: number;
  contact_no: string;
  medical_history?: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name?: string;
  doctor_id: string;
  receptionist_id: string;
  appointment_date: string;
  appointment_time: string;
  reason_for_visit?: string;
  symptoms?: string;
  status: string;
  denial_reason?: string;
  created_at: string;
  updated_at: string;
  requires_payment?: boolean;
  patients?: Patient;
  doctor_profile?: { name: string };
  receptionist_profile?: { name: string };
}

export interface Payment {
  id: string;
  appointment_id: string;
  appointment_fee: number;
  test_payments: Array<{ test_name: string; amount: number }>;
  payment_method: string;
  created_at: string;
}

// Helper function to calculate total payment amount
export const calculatePaymentTotal = (payment: Payment): number => {
  const appointmentFee = Number(payment.appointment_fee || 0);
  const testTotal = Array.isArray(payment.test_payments)
    ? payment.test_payments.reduce((sum, test) => sum + Number(test.amount || 0), 0)
    : 0;
  return appointmentFee + testTotal;
};

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  // Fetch all appointments
  const fetchAppointments = async () => {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patients (*),
          doctor_profile:profiles!appointments_doctor_id_fkey (name),
          receptionist_profile:profiles!appointments_receptionist_id_fkey (name)
        `);

      // Filter based on user role
      if (profile?.role === 'doctor') {
        query = query.eq('doctor_id', profile.user_id);
      }
      // Receptionists can see all appointments to manage them
      // No filtering needed for receptionists

      const { data, error } = await query.order('appointment_date', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch appointments',
        variant: 'destructive',
      });
    }
  };

  // Fetch all patients
  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  // Fetch all doctors
  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor')
        .order('name', { ascending: true });

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  // Fetch payments
  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Cast test_payments from Json to the proper type
      const typedPayments = (data || []).map(payment => ({
        ...payment,
        test_payments: payment.test_payments as Array<{ test_name: string; amount: number }> | undefined
      }));
      
      setPayments(typedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  // Search for patient by name
  const searchPatientByName = async (name: string): Promise<Patient | null> => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .ilike('name', name)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error searching patient:', error);
      return null;
    }
  };

  // Create or update patient
  const upsertPatient = async (patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Check if patient already exists by name and contact
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('*')
        .eq('name', patientData.name)
        .eq('contact_no', patientData.contact_no)
        .maybeSingle();

      if (existingPatient) {
        // Update existing patient
        const { data, error } = await supabase
          .from('patients')
          .update(patientData)
          .eq('id', existingPatient.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new patient
        const { data, error } = await supabase
          .from('patients')
          .insert(patientData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error upserting patient:', error);
      throw error;
    }
  };

  // Create appointment
  const createAppointment = async (appointmentData: {
    patient_id: string;
    patient_name: string;
    doctor_id: string;
    appointment_date: string;
    appointment_time: string;
    reason_for_visit?: string;
    symptoms?: string;
    isWalkIn?: boolean;
    is_repeat?: boolean;
    previous_appointment_id?: string | null;
    requires_payment?: boolean;
  }) => {
    try {
      if (!profile?.user_id) throw new Error('User not authenticated');

      // Walk-in appointments are auto-approved
      const appointmentStatus = appointmentData.isWalkIn ? 'approved' : 'pending';

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: appointmentData.patient_id,
          patient_name: appointmentData.patient_name,
          doctor_id: appointmentData.doctor_id,
          appointment_date: appointmentData.appointment_date,
          appointment_time: appointmentData.appointment_time,
          reason_for_visit: appointmentData.reason_for_visit,
          symptoms: appointmentData.symptoms,
          receptionist_id: profile.user_id,
          status: appointmentStatus,
          is_repeat: appointmentData.is_repeat || false,
          previous_appointment_id: appointmentData.previous_appointment_id,
          requires_payment: appointmentData.requires_payment ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      const successMessage = appointmentData.isWalkIn 
        ? 'Walk-in appointment created and automatically approved'
        : 'Appointment created successfully';

      toast({
        title: 'Success',
        description: successMessage,
      });

      // Only send push notification to doctor if it's NOT a walk-in
      if (!appointmentData.isWalkIn) {
        const { sendPushNotification } = await import('@/utils/notifications');
        const { data: patient } = await supabase
          .from('patients')
          .select('name')
          .eq('id', appointmentData.patient_id)
          .single();
        
        await sendPushNotification(
          appointmentData.doctor_id,
          'New Appointment',
          `New appointment scheduled with ${patient?.name || 'a patient'} on ${appointmentData.appointment_date} at ${appointmentData.appointment_time}`
        );
      }

      await fetchAppointments();
      return data;
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create appointment',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Update appointment status
  const updateAppointmentStatus = async (
    appointmentId: string,
    status: string,
    denialReason?: string
  ) => {
    try {
      const updateData: any = { status };
      if (denialReason) {
        updateData.denial_reason = denialReason;
      }
      
      // If appointment is marked as missed, reset it to pending for rescheduling
      if (status === 'missed') {
        updateData.status = 'pending';
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (error) throw error;

      const successMessage = status === 'missed' 
        ? 'Appointment marked as missed and sent back for rescheduling'
        : `Appointment ${status} successfully`;

      toast({
        title: 'Success',
        description: successMessage,
      });

      // Send push notification to receptionist when appointment is approved
      if (status === 'approved') {
        const { data: appointment } = await supabase
          .from('appointments')
          .select('receptionist_id, patient_id, appointment_date, appointment_time')
          .eq('id', appointmentId)
          .single();

        if (appointment?.receptionist_id) {
          const { data: patient } = await supabase
            .from('patients')
            .select('name')
            .eq('id', appointment.patient_id)
            .single();

          const { sendPushNotification } = await import('@/utils/notifications');
          await sendPushNotification(
            appointment.receptionist_id,
            'Appointment Approved',
            `Appointment with ${patient?.name || 'patient'} on ${appointment.appointment_date} at ${appointment.appointment_time} has been approved`
          );
        }

        showNotification('Appointment Approved', 'An appointment has been approved by the doctor');
      }

      await fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update appointment',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Update appointment details
  const updateAppointment = async (
    appointmentId: string,
    updateData: {
      patient_id: string;
      patient_name?: string;
      patient_age?: number;
      contact_no?: string;
      doctor_id?: string;
      appointment_date?: string;
      appointment_time?: string;
      reason_for_visit?: string;
      symptoms?: string;
    },
    timingChanged: boolean = false
  ) => {
    try {
      // Update patient information if provided
      if (updateData.patient_name || updateData.patient_age || updateData.contact_no) {
        const patientUpdateData: any = {};
        if (updateData.patient_name) patientUpdateData.name = updateData.patient_name;
        if (updateData.patient_age) patientUpdateData.age = updateData.patient_age;
        if (updateData.contact_no) patientUpdateData.contact_no = updateData.contact_no;

        const { error: patientError } = await supabase
          .from('patients')
          .update(patientUpdateData)
          .eq('id', updateData.patient_id);

        if (patientError) throw patientError;
      }

      // Prepare appointment update data
      const appointmentUpdateData: any = {
        doctor_id: updateData.doctor_id,
        appointment_date: updateData.appointment_date,
        appointment_time: updateData.appointment_time,
        reason_for_visit: updateData.reason_for_visit,
        symptoms: updateData.symptoms,
      };

      // Only set status to pending if timing changed
      if (timingChanged) {
        appointmentUpdateData.status = 'pending';
      }

      const { error } = await supabase
        .from('appointments')
        .update(appointmentUpdateData)
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: timingChanged 
          ? 'Appointment updated and sent to doctor for approval'
          : 'Appointment updated successfully',
      });

      await fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update appointment',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Create or update payment (upsert behavior)
  const createPayment = async (paymentData: {
    appointment_id: string;
    appointment_fee: number;
    test_payments: Array<{ test_name: string; amount: number }>;
    payment_method: string;
    labs_payment_method?: string | null;
  }) => {
    try {
      // Check if payment already exists for this appointment
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('appointment_id', paymentData.appointment_id)
        .maybeSingle();

      let data;
      if (existingPayment) {
        // Update existing payment
        const { data: updatedData, error } = await supabase
          .from('payments')
          .update({
            appointment_fee: paymentData.appointment_fee,
            test_payments: paymentData.test_payments,
            payment_method: paymentData.payment_method,
            labs_payment_method: paymentData.labs_payment_method,
          })
          .eq('id', existingPayment.id)
          .select()
          .single();

        if (error) throw error;
        data = updatedData;

        toast({
          title: 'Success',
          description: 'Payment updated successfully',
        });
      } else {
        // Create new payment record
        const { data: newData, error } = await supabase
          .from('payments')
          .insert(paymentData)
          .select()
          .single();

        if (error) throw error;
        data = newData;

        toast({
          title: 'Success',
          description: 'Payment recorded and appointment completed',
        });
      }

      // Update appointment status to completed
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', paymentData.appointment_id);

      if (updateError) throw updateError;

      await fetchPayments();
      await fetchAppointments();
      return data;
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Delete appointment
  const deleteAppointment = async (appointmentId: string) => {
    try {
      // Delete associated payments first
      await supabase
        .from("payments")
        .delete()
        .eq("appointment_id", appointmentId);

      // Delete the appointment
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Appointment deleted successfully',
      });

      await fetchAppointments();
      await fetchPayments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete appointment',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Delete patient
  const deletePatient = async (patientId: string) => {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Patient deleted successfully',
      });

      await fetchPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete patient',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (profile?.user_id) {
        setLoading(true);
        await Promise.all([
          fetchAppointments(),
          fetchPatients(),
          fetchDoctors(),
          fetchPayments(),
        ]);
        setLoading(false);
      }
    };

    loadData();
  }, [profile?.user_id]);

  return {
    appointments,
    patients,
    payments,
    doctors,
    loading,
    createAppointment,
    upsertPatient,
    updateAppointmentStatus,
    updateAppointment,
    createPayment,
    deleteAppointment,
    deletePatient,
    fetchAppointments,
    fetchPatients,
    fetchPayments,
    searchPatientByName,
  };
};