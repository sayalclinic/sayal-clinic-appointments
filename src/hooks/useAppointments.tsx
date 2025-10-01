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
  patients?: Patient;
  doctor_profile?: { name: string };
  receptionist_profile?: { name: string };
}

export interface Payment {
  id: string;
  appointment_id: string;
  amount: number;
  payment_method: string;
  tests_done?: string;
  created_at: string;
}

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
      setPayments(data || []);
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
    doctor_id: string;
    appointment_date: string;
    appointment_time: string;
    reason_for_visit?: string;
    symptoms?: string;
  }) => {
    try {
      if (!profile?.user_id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointmentData,
          receptionist_id: profile.user_id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Appointment created successfully',
      });

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

      // Show notification for approval
      if (status === 'approved') {
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
      doctor_id?: string;
      appointment_date?: string;
      appointment_time?: string;
      reason_for_visit?: string;
      symptoms?: string;
    }
  ) => {
    try {
      // When appointment is edited, reset status to pending for doctor approval
      const finalUpdateData = {
        ...updateData,
        status: 'pending'
      };

      const { error } = await supabase
        .from('appointments')
        .update(finalUpdateData)
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Appointment updated and sent back to doctor for approval',
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

  // Create payment
  const createPayment = async (paymentData: {
    appointment_id: string;
    amount: number;
    payment_method: string;
    tests_done?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });

      await fetchPayments();
      return data;
    } catch (error) {
      console.error('Error creating payment:', error);
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