import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IndianRupee, Download, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PinDialog } from '@/components/Auth/PinDialog';
import { useToast } from '@/hooks/use-toast';

interface AppointmentHistoryRow {
  patient_name: string;
  age: number;
  phone: string;
  date: string;
  doctor_name: string;
}

interface PatientHistoryRow {
  name: string;
  age: number;
  contact_no: string;
}

interface PaymentHistoryRow {
  patient_name: string;
  date: string;
  tests_done: string;
  amount: number;
  payment_method: string;
}

export const StatsPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [appointmentHistory, setAppointmentHistory] = useState<AppointmentHistoryRow[]>([]);
  const [patientHistory, setPatientHistory] = useState<PatientHistoryRow[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryRow[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Fetch monthly earnings
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, created_at');
      
      const monthlyTotal = payments?.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      }).reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      
      setMonthlyEarnings(monthlyTotal);

      // Fetch appointment history
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          patient_name,
          appointment_date,
          patients (name, age, contact_no),
          doctor_profile:profiles!appointments_doctor_id_fkey (name)
        `)
        .order('appointment_date', { ascending: false });

      const appointmentData: AppointmentHistoryRow[] = appointments?.map(apt => ({
        patient_name: apt.patients?.name || apt.patient_name || 'Unknown',
        age: apt.patients?.age || 0,
        phone: apt.patients?.contact_no || 'N/A',
        date: apt.appointment_date,
        doctor_name: apt.doctor_profile?.name || 'Unknown'
      })) || [];
      
      setAppointmentHistory(appointmentData);

      // Fetch patient history
      const { data: patients } = await supabase
        .from('patients')
        .select('name, age, contact_no')
        .order('name', { ascending: true });

      setPatientHistory(patients || []);

      // Fetch payment history
      const { data: paymentData } = await supabase
        .from('payments')
        .select(`
          amount,
          payment_method,
          tests_done,
          created_at,
          appointments (
            patient_name,
            patients (name)
          )
        `)
        .order('created_at', { ascending: false });

      const paymentHistoryData: PaymentHistoryRow[] = paymentData?.map(p => ({
        patient_name: p.appointments?.patients?.name || p.appointments?.patient_name || 'Unknown',
        date: new Date(p.created_at).toLocaleDateString(),
        tests_done: p.tests_done || 'N/A',
        amount: Number(p.amount),
        payment_method: p.payment_method
      })) || [];
      
      setPaymentHistory(paymentHistoryData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load statistics',
        variant: 'destructive',
      });
    }
  };

  const downloadCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const key = header.toLowerCase().replace(/ /g, '_');
          const value = row[key] || '';
          return `"${value}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center">
        <PinDialog
          open={true}
          onOpenChange={() => navigate('/dashboard')}
          onSuccess={() => setIsAuthenticated(true)}
          title="Receptionist Authentication"
          description="Enter PIN to access statistics (PIN: 1978)"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">Statistics & Reports</h1>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Monthly Earnings Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <IndianRupee className="w-6 h-6 text-primary" />
              Total Earnings This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              ₹{monthlyEarnings.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        {/* Appointment History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Appointment History</CardTitle>
            <Button
              onClick={() => downloadCSV(
                appointmentHistory,
                'appointment_history',
                ['Patient Name', 'Age', 'Phone', 'Date', 'Doctor Name']
              )}
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Patient Name</th>
                    <th className="text-left p-2">Age</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Doctor</th>
                  </tr>
                </thead>
                <tbody>
                  {appointmentHistory.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-accent/5">
                      <td className="p-2">{row.patient_name}</td>
                      <td className="p-2">{row.age}</td>
                      <td className="p-2">{row.phone}</td>
                      <td className="p-2">{row.date}</td>
                      <td className="p-2">{row.doctor_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Patient History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Patient History</CardTitle>
            <Button
              onClick={() => downloadCSV(
                patientHistory,
                'patient_history',
                ['Name', 'Age', 'Contact No']
              )}
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Age</th>
                    <th className="text-left p-2">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {patientHistory.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-accent/5">
                      <td className="p-2">{row.name}</td>
                      <td className="p-2">{row.age}</td>
                      <td className="p-2">{row.contact_no}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payment & Test History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payment & Test History</CardTitle>
            <Button
              onClick={() => downloadCSV(
                paymentHistory,
                'payment_history',
                ['Patient Name', 'Date', 'Tests Done', 'Amount', 'Payment Method']
              )}
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Patient</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Tests</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-accent/5">
                      <td className="p-2">{row.patient_name}</td>
                      <td className="p-2">{row.date}</td>
                      <td className="p-2">{row.tests_done}</td>
                      <td className="p-2">₹{row.amount.toFixed(2)}</td>
                      <td className="p-2">{row.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
