import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PinDialog } from "@/components/Auth/PinDialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, IndianRupee, Maximize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AppointmentHistoryRow {
  patient_name: string;
  patient_age: number;
  patient_contact: string;
  appointment_date: string;
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
  const [openModal, setOpenModal] = useState<'appointments' | 'patients' | 'payments' | null>(null);
  const [ageFilter, setAgeFilter] = useState<'all' | 'monthly'>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Fetch monthly earnings for current month
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
      
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount")
        .gte("created_at", firstDayOfMonth)
        .lte("created_at", lastDayOfMonth);

      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
      }

      const monthlyTotal = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      setMonthlyEarnings(monthlyTotal);

      // Fetch appointment history
      const { data: appointments } = await supabase
        .from("appointments")
        .select(`
          patient_name,
          appointment_date,
          patients (name, age, contact_no),
          doctor_profile:profiles!appointments_doctor_id_fkey (name)
        `)
        .order("appointment_date", { ascending: false });

      const appointmentData: AppointmentHistoryRow[] =
        appointments?.map((apt) => ({
          patient_name: apt.patients?.name || apt.patient_name || "Unknown",
          patient_age: apt.patients?.age || 0,
          patient_contact: apt.patients?.contact_no || "N/A",
          appointment_date: apt.appointment_date,
          doctor_name: apt.doctor_profile?.name || "Unknown",
        })) || [];

      setAppointmentHistory(appointmentData);

      // Fetch patient history
      const { data: patients } = await supabase
        .from("patients")
        .select("name, age, contact_no")
        .order("name", { ascending: true });

      if (patients) {
        setPatientHistory(patients);
      }

      // Fetch payment history
      const { data: paymentData } = await supabase
        .from("payments")
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
        .order("created_at", { ascending: false });

      const paymentHistoryData: PaymentHistoryRow[] =
        paymentData?.map((p) => ({
          patient_name:
            p.appointments?.patients?.name ||
            p.appointments?.patient_name ||
            "Unknown",
          date: new Date(p.created_at).toLocaleDateString(),
          tests_done: p.tests_done || "N/A",
          amount: Number(p.amount),
          payment_method: p.payment_method,
        })) || [];

      setPaymentHistory(paymentHistoryData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, toast]);


  // Calculate age distribution from appointments
  const [patientVisits, setPatientVisits] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchPatientVisits = async () => {
      if (isAuthenticated) {
        const { data, error } = await supabase
          .from("appointments")
          .select(`
            appointment_date,
            patients!inner (age)
          `)
          .not("patients.age", "is", null);
        
        if (error) {
          console.error("Error fetching appointment data:", error);
        }
        if (data) {
          const formattedData = data.map(apt => ({
            visit_date: apt.appointment_date,
            patients: { age: apt.patients.age }
          }));
          setPatientVisits(formattedData);
        }
      }
    };
    fetchPatientVisits();
  }, [isAuthenticated]);

  const filteredVisits = patientVisits.filter((visit) => {
    if (ageFilter === 'all') return true;
    const visitDate = new Date(visit.visit_date);
    return visitDate.getMonth() === selectedMonth && visitDate.getFullYear() === selectedYear;
  });

  const ageData = filteredVisits.reduce((acc, visit) => {
    const age = visit.patients?.age;
    if (!age) return acc;
    
    let ageGroup = '';
    if (age < 18) ageGroup = '0-17';
    else if (age < 30) ageGroup = '18-29';
    else if (age < 45) ageGroup = '30-44';
    else if (age < 60) ageGroup = '45-59';
    else ageGroup = '60+';
    
    const existing = acc.find(item => item.name === ageGroup);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: ageGroup, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Sort age data by age group
  const ageGroupOrder = ['0-17', '18-29', '30-44', '45-59', '60+'];
  ageData.sort((a, b) => ageGroupOrder.indexOf(a.name) - ageGroupOrder.indexOf(b.name));

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);


  

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-3xl font-bold text-primary">Statistics & Reports</h1>
          <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>

        {/* Monthly Earnings Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
              <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <span className="truncate">Total Earnings This Month</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl sm:text-4xl font-bold text-primary">
              ₹{monthlyEarnings.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        {/* Appointment History */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setOpenModal('appointments')}
        >
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center justify-between text-base sm:text-lg">
              <span>Appointment History</span>
              <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Patient History with Charts */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setOpenModal('patients')}
        >
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center justify-between text-base sm:text-lg">
              <span className="truncate">Patient History & Analytics</span>
              <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6 pt-0">
            {/* Age Distribution Only */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-sm sm:text-lg font-semibold">Age Distribution</h3>
                <div className="flex gap-2 overflow-x-auto">
                  <Select value={ageFilter} onValueChange={(v: 'all' | 'monthly') => setAgeFilter(v)}>
                    <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  {ageFilter === 'monthly' && (
                    <>
                      <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                        <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-20 sm:w-24 h-8 sm:h-10 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="value" fill="#8884d8" name="Visits" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setOpenModal('payments')}
        >
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center justify-between text-base sm:text-lg">
              <span>Payment History</span>
              <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Appointment History Modal */}
        <Dialog open={openModal === 'appointments'} onOpenChange={() => setOpenModal(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="p-3 sm:p-6 pb-3">
              <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-base sm:text-lg">Appointment History</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCSV(appointmentHistory, 'appointment-history')}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Download CSV
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto px-3 sm:px-6">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1 sm:p-2 whitespace-nowrap">Patient</th>
                    <th className="text-left p-1 sm:p-2 whitespace-nowrap">Age</th>
                    <th className="text-left p-1 sm:p-2 whitespace-nowrap hidden sm:table-cell">Phone</th>
                    <th className="text-left p-1 sm:p-2 whitespace-nowrap">Date</th>
                    <th className="text-left p-1 sm:p-2 whitespace-nowrap hidden md:table-cell">Doctor</th>
                  </tr>
                </thead>
                <tbody>
                  {appointmentHistory.map((apt, idx) => (
                    <tr key={idx} className="border-b hover:bg-accent/5">
                      <td className="p-1 sm:p-2 max-w-[100px] truncate">{apt.patient_name}</td>
                      <td className="p-1 sm:p-2">{apt.patient_age}</td>
                      <td className="p-1 sm:p-2 hidden sm:table-cell">{apt.patient_contact}</td>
                      <td className="p-1 sm:p-2 whitespace-nowrap">{apt.appointment_date}</td>
                      <td className="p-1 sm:p-2 hidden md:table-cell max-w-[120px] truncate">{apt.doctor_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>

        {/* Patient History Modal */}
        <Dialog open={openModal === 'patients'} onOpenChange={() => setOpenModal(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="p-3 sm:p-6 pb-3">
              <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-base sm:text-lg">Patient History</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCSV(patientHistory, 'patient-history')}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Download CSV
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto px-3 sm:px-6">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1 sm:p-2">Name</th>
                    <th className="text-left p-1 sm:p-2">Age</th>
                    <th className="text-left p-1 sm:p-2">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {patientHistory.map((patient, idx) => (
                    <tr key={idx} className="border-b hover:bg-accent/5">
                      <td className="p-1 sm:p-2 max-w-[150px] truncate">{patient.name}</td>
                      <td className="p-1 sm:p-2">{patient.age}</td>
                      <td className="p-1 sm:p-2">{patient.contact_no}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment History Modal */}
        <Dialog open={openModal === 'payments'} onOpenChange={() => setOpenModal(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Payment History</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCSV(paymentHistory, 'payment-history')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </DialogTitle>
            </DialogHeader>
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
                  {paymentHistory.map((payment, idx) => (
                    <tr key={idx} className="border-b hover:bg-accent/5">
                      <td className="p-2">{payment.patient_name}</td>
                      <td className="p-2">{payment.date}</td>
                      <td className="p-2">{payment.tests_done || 'N/A'}</td>
                      <td className="p-2">₹{payment.amount.toFixed(2)}</td>
                      <td className="p-2">{payment.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};