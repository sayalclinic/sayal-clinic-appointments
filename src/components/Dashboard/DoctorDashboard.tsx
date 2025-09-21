import { useState } from 'react';
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

export const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  
  const { appointments, loading, updateAppointmentStatus } = useAppointments();
  const { profile } = useAuth();

  const pendingAppointments = appointments.filter(apt => apt.status === 'pending');
  const todayAppointments = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0];
    return apt.appointment_date === today && apt.status === 'approved';
  });
  const totalPatients = appointments.filter(apt => apt.status === 'completed').length;

  const handleApprove = async (appointmentId: string) => {
    await updateAppointmentStatus(appointmentId, 'approved');
  };

  const handleDeny = async (appointmentId: string, reason: string) => {
    await updateAppointmentStatus(appointmentId, 'denied', reason);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-medical-dark mb-2">Doctor Dashboard</h2>
          <p className="text-muted-foreground">Manage your appointments and patient care</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingAppointments.length}</div>
              <p className="text-xs text-muted-foreground">
                Appointments awaiting review
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{todayAppointments.length}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled for today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <User className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{totalPatients}</div>
              <p className="text-xs text-muted-foreground">
                Patients served
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-medical-light/50">
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pending Approvals
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              My Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-warning" />
                  <span>Appointments Awaiting Approval</span>
                </CardTitle>
                <CardDescription>
                  Review and approve or deny appointment requests
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
                        const dateStr = selectedDate.toISOString().split('T')[0];
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};