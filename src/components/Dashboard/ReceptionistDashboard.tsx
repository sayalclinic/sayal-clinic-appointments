import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Clock, User, FileText, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { AppointmentForm } from '@/components/Appointments/AppointmentForm';
import { AppointmentCard } from '@/components/Appointments/AppointmentCard';
import { AppointmentCalendar } from '@/components/Calendar/AppointmentCalendar';
import { PaymentDialog } from '@/components/Payments/PaymentDialog';
import { useAppointments } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export const ReceptionistDashboard = () => {
  const [activeTab, setActiveTab] = useState('add-appointment');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  
  const { appointments, loading, updateAppointmentStatus } = useAppointments();
  const { toast } = useToast();
  const { profile } = useAuth();

  const pendingAppointments = appointments.filter(apt => apt.status === 'pending' || apt.status === 'denied');
  const todayAppointments = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0];
    return apt.appointment_date === today;
  });

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-medical-dark mb-2">Receptionist Dashboard</h2>
          <p className="text-muted-foreground">Manage appointments and patient registration</p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-medical-light/50">
            <TabsTrigger value="add-appointment" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Add Appointment
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pending
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add-appointment" className="space-y-4">
            <AppointmentForm onSuccess={() => {
              toast({
                title: 'Success',
                description: 'Appointment created successfully and sent for doctor approval',
              });
            }} />
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-warning" />
                  <span>Pending Appointments</span>
                </CardTitle>
                <CardDescription>
                  Appointments waiting for doctor approval or requiring attention
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
                        onEdit={handleEdit}
                        onComplete={handleComplete}
                        onMissed={handleMissed}
                        onPaymentSuccess={handlePaymentSuccess}
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
                />
              </div>
              <div className="space-y-4">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedDate 
                        ? `Appointments for ${selectedDate.toLocaleDateString()}`
                        : 'Select a date'
                      }
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedDate ? (
                       (() => {
                         const year = selectedDate.getFullYear();
                         const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                         const day = String(selectedDate.getDate()).padStart(2, '0');
                         const dateStr = `${year}-${month}-${day}`;
                         const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr);
                        return dayAppointments.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">No appointments scheduled</p>
                        ) : (
            <div className="space-y-3">
              {dayAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onEdit={handleEdit}
                  onComplete={handleComplete}
                  onMissed={handleMissed}
                  onPaymentSuccess={handlePaymentSuccess}
                  showActions={true}
                />
              ))}
            </div>
                        );
                      })()
                    ) : (
                      <p className="text-muted-foreground text-center py-4">Click on a date to view appointments</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
              <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{todayAppointments.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Scheduled appointments
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                  <Clock className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{pendingAppointments.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting doctor approval
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Apps</CardTitle>
                  <Users className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{appointments.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Total appointments
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                  <User className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {appointments.filter(apt => 
                      apt.status === 'completed' && 
                      apt.appointment_date === new Date().toISOString().split('T')[0]
                    ).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Completed appointments
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Payment Dialog - No longer needed as it's handled within AppointmentCard */}
      </div>
    </DashboardLayout>
  );
};