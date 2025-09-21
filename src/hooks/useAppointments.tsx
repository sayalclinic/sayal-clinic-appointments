import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

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
      } else if (profile?.role === 'receptionist') {
        query = query.eq('receptionist_id', profile.user_id);
      }

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

  // Create or update patient
  const upsertPatient = async (patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Check if patient already exists by name and contact
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('*')
        .eq('name', patientData.name)
        .eq('contact_no', patientData.contact_no)
        .single();

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

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Appointment ${status} successfully`,
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

  useEffect(() => {
    const loadData = async () => {
      if (profile) {
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
  }, [profile]);

  return {
    appointments,
    patients,
    payments,
    doctors,
    loading,
    createAppointment,
    upsertPatient,
    updateAppointmentStatus,
    createPayment,
    fetchAppointments,
    fetchPatients,
    fetchPayments,
  };
};