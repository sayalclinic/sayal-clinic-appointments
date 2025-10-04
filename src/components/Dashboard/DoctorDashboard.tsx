import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { AppointmentCard } from '@/components/Appointments/AppointmentCard';
import { AppointmentCalendar } from '@/components/Calendar/AppointmentCalendar';
import { useAppointments } from '@/hooks/useAppointments';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [doctorEarnings, setDoctorEarnings] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [completedThisMonth, setCompletedThisMonth] = useState(0);
  
  const { appointments, loading, updateAppointmentStatus } = useAppointments();
  const { profile } = useAuth();

  const pendingAppointments = appointments.filter(apt => apt.status === 'pending');
  const todayAppointments = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0];
    return apt.appointment_date === today && apt.status === 'approved';
  });
  const totalPatients = appointments.filter(apt => apt.status === 'completed').length;

  useEffect(() => {
    if (profile?.user_id) {
      fetchDoctorEarnings();
    }
  }, [appointments, profile?.user_id]);

  const fetchDoctorEarnings = async () => {
    try {
      // Fetch earnings for appointments handled by this doctor
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, appointments!inner(doctor_id)')
        .eq('appointments.doctor_id', profile?.user_id);
      
      const earnings = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      setDoctorEarnings(earnings);

      // Calculate completed appointments for this doctor
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const doctorAppointments = appointments.filter(apt => apt.doctor_id === profile?.user_id);

      const completedTodayCount = doctorAppointments.filter(apt => 
        apt.status === 'completed' && apt.appointment_date === today
      ).length;

      const completedThisMonthCount = doctorAppointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return apt.status === 'completed' && 
               aptDate.getMonth() === currentMonth && 
               aptDate.getFullYear() === currentYear;
      }).length;

      setCompletedToday(completedTodayCount);
      setCompletedThisMonth(completedThisMonthCount);
    } catch (error) {
      console.error('Error fetching doctor earnings:', error);
    }
  };

  const handleApprove = async (appointmentId: string) => {
    await updateAppointmentStatus(appointmentId, 'approved');
  };

  const handleDeny = async (appointmentId: string, reason: string) => {
    await updateAppointmentStatus(appointmentId, 'denied', reason);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Section */}
        <div className="text-center px-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">Doctor Dashboard</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your appointments and patient care</p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-secondary/50 h-auto p-1">
            <TabsTrigger 
              value="pending" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground smooth-transition text-xs sm:text-sm py-2"
            >
              <span className="hidden sm:inline">Pending Approvals</span>
              <span className="sm:hidden">Pending</span>
            </TabsTrigger>
            <TabsTrigger 
              value="schedule" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground smooth-transition text-xs sm:text-sm py-2"
            >
              <span className="hidden sm:inline">My Schedule</span>
              <span className="sm:hidden">Schedule</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card className="clinic-card">
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning flex-shrink-0" />
                  <span className="text-sm sm:text-base">Awaiting Approval</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Review and approve or deny requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading appointments...</p>
                  </div>
                ) : pendingAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No pending appointments</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onApprove={handleApprove}
                        onDeny={handleDeny}
                        showActions={true}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AppointmentCalendar
                  appointments={appointments.filter(apt => apt.status === 'approved')}
                  onDateSelect={setSelectedDate}
                  selectedDate={selectedDate}
                />
              </div>
              <div className="space-y-4">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedDate 
                        ? `My Schedule for ${selectedDate.toLocaleDateString()}`
                        : 'Select a date'
                      }
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedDate ? (
                      (() => {
                        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                        const dayAppointments = appointments.filter(apt => 
                          apt.appointment_date === dateStr && apt.status === 'approved'
                        );
                        return dayAppointments.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">No appointments scheduled</p>
                        ) : (
                          <div className="space-y-3">
                            {dayAppointments.map((appointment) => (
                              <AppointmentCard
                                key={appointment.id}
                                appointment={appointment}
                                showActions={false}
                              />
                            ))}
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-muted-foreground text-center py-4">Click on a date to view your schedule</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mt-4 sm:mt-6">
              <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
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
                  <p className="text-xs text-muted-foreground">
                    Scheduled this month
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Appointments</CardTitle>
                  <Clock className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    {completedToday} / {completedThisMonth}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Today / This Month
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Earnings</CardTitle>
                  <User className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">
                    ${doctorEarnings.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your total earnings
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};