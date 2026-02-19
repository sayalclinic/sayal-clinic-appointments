import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, FileText, IndianRupee, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [earningsPeriod, setEarningsPeriod] = useState<'daily' | 'monthly' | 'all'>('monthly');
  
  const { appointments, loading, updateAppointmentStatus, fetchMonthAppointments } = useAppointments();
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
  }, [appointments, profile?.user_id, earningsPeriod]);

  const fetchDoctorEarnings = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      let query = supabase
        .from('payments')
        .select('appointment_fee, appointments!inner(doctor_id, appointment_date)')
        .eq('appointments.doctor_id', profile?.user_id);

      // Apply date filtering based on selected period
      if (earningsPeriod === 'daily') {
        query = query.eq('appointments.appointment_date', today);
      } else if (earningsPeriod === 'monthly') {
        const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
        query = query.gte('appointments.appointment_date', startOfMonth)
                     .lte('appointments.appointment_date', endOfMonth);
      }

      const { data: payments } = await query;
      
      // Calculate only consultation earnings (appointment_fee)
      const earnings = payments?.reduce((sum, payment) => sum + Number(payment.appointment_fee || 0), 0) || 0;
      setDoctorEarnings(earnings);
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
        {/* Welcome Section with Refresh */}
        <div className="text-center px-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h2 className="text-xl sm:text-3xl font-bold text-primary">Doctor Dashboard</h2>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-full hover:bg-primary/10"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 text-primary" />
            </Button>
          </div>
          <p className="text-xs sm:text-base text-muted-foreground">Manage your appointments and patient care</p>
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
                  appointments={appointments}
                  onDateSelect={setSelectedDate}
                  selectedDate={selectedDate}
                  onMonthChange={(year, month) => fetchMonthAppointments(year, month)}
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
                        const activeAppointments = appointments.filter(apt => 
                          apt.appointment_date === dateStr && 
                          (apt.status === 'approved' || apt.status === 'pending')
                        );
                        const inactiveAppointments = appointments.filter(apt => 
                          apt.appointment_date === dateStr && 
                          (apt.status === 'completed' || apt.status === 'missed')
                        );
                        const hasAnyAppointments = activeAppointments.length > 0 || inactiveAppointments.length > 0;
                        
                        return !hasAnyAppointments ? (
                          <p className="text-muted-foreground text-center py-4">No appointments scheduled</p>
                        ) : (
                          <div className="space-y-3">
                            {activeAppointments.map((appointment) => (
                              <AppointmentCard
                                key={appointment.id}
                                appointment={appointment}
                                showActions={false}
                              />
                            ))}
                            {inactiveAppointments.length > 0 && (
                              <>
                                {activeAppointments.length > 0 && (
                                  <div className="border-t border-border my-2 pt-2">
                                    <p className="text-xs text-muted-foreground mb-2">Past Appointments</p>
                                  </div>
                                )}
                                {inactiveAppointments.map((appointment) => (
                                  <AppointmentCard
                                    key={appointment.id}
                                    appointment={appointment}
                                    showActions={false}
                                    isTranslucent={true}
                                  />
                                ))}
                              </>
                            )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mt-4 sm:mt-6">
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

              <Card className="group bg-gradient-to-br from-card via-card to-secondary/30 border-l-4 border-l-accent shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">My Earnings</CardTitle>
                  <div className="p-2 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors duration-150">
                    <IndianRupee className="h-4 w-4 text-accent-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-bold text-accent-foreground">
                      ₹{doctorEarnings.toFixed(2)}
                    </div>
                    <Select value={earningsPeriod} onValueChange={(value: 'daily' | 'monthly' | 'all') => setEarningsPeriod(value)}>
                      <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Consultation income
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