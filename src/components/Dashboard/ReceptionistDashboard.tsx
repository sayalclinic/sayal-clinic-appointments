import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Clock, User, FileText, Users, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { AppointmentForm } from '@/components/Appointments/AppointmentForm';
import { AppointmentCard } from '@/components/Appointments/AppointmentCard';
import { AppointmentCalendar } from '@/components/Calendar/AppointmentCalendar';
import { PaymentDialog } from '@/components/Payments/PaymentDialog';
import { useAppointments } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
export const ReceptionistDashboard = () => {
  const [activeTab, setActiveTab] = useState('add-appointment');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showEarnings, setShowEarnings] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [completedThisMonth, setCompletedThisMonth] = useState(0);
  const [totalAppointmentsThisMonth, setTotalAppointmentsThisMonth] = useState(0);
  const {
    appointments,
    loading,
    updateAppointmentStatus,
    deleteAppointment
  } = useAppointments();
  const {
    toast
  } = useToast();
  const {
    profile
  } = useAuth();
  const pendingAppointments = appointments.filter(apt => apt.status === 'pending' || apt.status === 'denied');
  const todayAppointments = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0];
    return apt.appointment_date === today;
  });
  useEffect(() => {
    fetchEarningsData();
  }, [appointments]);
  const fetchEarningsData = async () => {
    try {
      // Fetch total earnings
      const {
        data: payments
      } = await supabase.from('payments').select('appointment_fee, test_payments');
      const total = payments?.reduce((sum, payment) => {
        const appointmentFee = Number(payment.appointment_fee || 0);
        const testPaymentsArray = payment.test_payments as any;
        const testTotal = Array.isArray(testPaymentsArray)
          ? testPaymentsArray.reduce((testSum: number, test: any) => testSum + Number(test.amount || 0), 0)
          : 0;
        return sum + appointmentFee + testTotal;
      }, 0) || 0;
      setTotalEarnings(total);

      // Calculate completed appointments
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const completedTodayCount = appointments.filter(apt => apt.status === 'completed' && apt.appointment_date === today).length;
      const completedThisMonthCount = appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return apt.status === 'completed' && aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
      }).length;
      
      // Calculate total appointments this month
      const totalThisMonthCount = appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
      }).length;
      
      setCompletedToday(completedTodayCount);
      setCompletedThisMonth(completedThisMonthCount);
      setTotalAppointmentsThisMonth(totalThisMonthCount);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    }
  };
  const checkAccessCode = () => {
    if (accessCode === 'creative10') {
      setShowEarnings(true);
      setAccessCode('');
    } else {
      alert('Invalid access code');
      setAccessCode('');
    }
  };
  const handleEdit = (appointmentId: string) => {
    // Edit functionality is now handled by the EditAppointmentDialog within AppointmentCard
    console.log('Edit appointment:', appointmentId);
  };
  const handleComplete = (appointmentId: string) => {
    // Complete functionality is now handled by the PaymentDialog within AppointmentCard
    console.log('Complete appointment:', appointmentId);
  };
  const handlePaymentSuccess = () => {
    // Refresh appointments after payment success
    window.location.reload();
  };
  const handleMissed = async (appointmentId: string) => {
    await updateAppointmentStatus(appointmentId, 'missed');
  };
  const handleDelete = async (appointmentId: string) => {
    try {
      await deleteAppointment(appointmentId);
      toast({
        title: 'Success',
        description: 'Appointment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete appointment',
        variant: 'destructive'
      });
    }
  };
  return <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Section with Refresh */}
        <div className="text-center px-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h2 className="text-xl sm:text-3xl font-bold text-primary">Receptionist Dashboard</h2>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-full hover:bg-primary/10"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 text-primary" />
            </Button>
          </div>
          <p className="text-xs sm:text-base text-muted-foreground">Manage appointments and patient registration</p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-secondary/50 h-auto p-1">
            <TabsTrigger value="add-appointment" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground smooth-transition text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Add Appointment</span>
              <span className="sm:hidden">Add</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground smooth-transition text-xs sm:text-sm py-2">
              Pending
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground smooth-transition text-xs sm:text-sm py-2">
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add-appointment" className="space-y-4">
            <AppointmentForm onSuccess={() => {
            toast({
              title: 'Success',
              description: 'Appointment created successfully and sent for doctor approval'
            });
          }} />
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <Card className="clinic-card">
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning flex-shrink-0" />
                  <span className="text-sm sm:text-base">Pending Appointments</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Awaiting doctor approval or attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading appointments...</p>
                  </div> : pendingAppointments.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No pending appointments</p>
                  </div> : <div className="space-y-4">
                     {pendingAppointments.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} onEdit={handleEdit} onComplete={handleComplete} onMissed={handleMissed} onDelete={handleDelete} onPaymentSuccess={handlePaymentSuccess} showActions={true} />)}
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AppointmentCalendar appointments={appointments} onDateSelect={setSelectedDate} selectedDate={selectedDate} />
              </div>
              <div className="space-y-4">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedDate ? `Appointments for ${selectedDate.toLocaleDateString()}` : 'Select a date'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedDate ? (() => {
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    const activeAppointments = appointments.filter(apt => apt.appointment_date === dateStr && apt.status !== 'completed' && apt.status !== 'denied' && apt.status !== 'missed');
                    const inactiveAppointments = appointments.filter(apt => apt.appointment_date === dateStr && (apt.status === 'completed' || apt.status === 'denied' || apt.status === 'missed'));
                    const hasAnyAppointments = activeAppointments.length > 0 || inactiveAppointments.length > 0;
                    return !hasAnyAppointments ? <p className="text-muted-foreground text-center py-4">No appointments scheduled</p> : <div className="space-y-3">
              {activeAppointments.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} onEdit={handleEdit} onComplete={handleComplete} onMissed={handleMissed} onDelete={handleDelete} onPaymentSuccess={handlePaymentSuccess} showActions={true} />)}
              {inactiveAppointments.length > 0 && <>
                  {activeAppointments.length > 0 && <div className="border-t border-border my-2 pt-2">
                      <p className="text-xs text-muted-foreground mb-2">Past Appointments</p>
                    </div>}
                  {inactiveAppointments.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} onEdit={handleEdit} onComplete={handleComplete} onMissed={handleMissed} onDelete={handleDelete} onPaymentSuccess={handlePaymentSuccess} showActions={true} isTranslucent={true} />)}
                </>}
            </div>;
                  })() : <p className="text-muted-foreground text-center py-4">Click on a date to view appointments</p>}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mt-4 sm:mt-6">
              <Card className="group bg-gradient-to-br from-card via-card to-secondary/30 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Monthly Appointments</CardTitle>
                  <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-150">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {appointments.filter(apt => {
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    const aptDate = new Date(apt.appointment_date);
                    return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
                  }).length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scheduled this month
                  </p>
                </CardContent>
              </Card>

              <Card className="group bg-gradient-to-br from-card via-card to-secondary/30 border-l-4 border-l-success shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Completed</CardTitle>
                  <div className="p-2 rounded-full bg-success/10 group-hover:bg-success/20 transition-colors duration-150">
                    <Clock className="h-4 w-4 text-success" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    {completedThisMonth} / {totalAppointmentsThisMonth}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Completed this month
                  </p>
                </CardContent>
              </Card>

              <Card className="group bg-gradient-to-br from-card via-card to-secondary/30 border-l-4 border-l-accent shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Statistics</CardTitle>
                  <div className="p-2 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors duration-150">
                    <FileText className="h-4 w-4 text-accent-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="default" className="w-full" onClick={() => window.location.href = '/stats'}>
                    <FileText className="w-4 h-4 mr-2" />
                    View Stats
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    PIN required
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Payment Dialog - No longer needed as it's handled within AppointmentCard */}
      </div>
    </DashboardLayout>;
};