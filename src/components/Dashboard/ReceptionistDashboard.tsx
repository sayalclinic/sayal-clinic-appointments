import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Clock, User, FileText, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';

export const ReceptionistDashboard = () => {
  const [activeTab, setActiveTab] = useState('add-appointment');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-medical-dark mb-2">Receptionist Dashboard</h2>
          <p className="text-muted-foreground">Manage appointments and patient registration</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">12</div>
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
              <div className="text-2xl font-bold text-warning">5</div>
              <p className="text-xs text-muted-foreground">
                Awaiting doctor approval
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
              <Users className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">156</div>
              <p className="text-xs text-muted-foreground">
                Total registered patients
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Doctors</CardTitle>
              <User className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">8</div>
              <p className="text-xs text-muted-foreground">
                Doctors on duty today
              </p>
            </CardContent>
          </Card>
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
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-primary" />
                  <span>Add New Appointment</span>
                </CardTitle>
                <CardDescription>
                  Register a new patient and schedule their appointment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Appointment Form</p>
                  <p className="text-sm mb-6">Complete appointment creation form coming soon...</p>
                  <Button className="bg-gradient-to-r from-primary to-medical-blue hover:from-primary-hover hover:to-primary text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
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
              <CardContent className="space-y-4">
                {/* Sample pending appointments */}
                <div className="border rounded-lg p-4 hover:bg-medical-light/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-medical-dark">Emma Wilson</h4>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          Pending Approval
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Dec 24, 2024</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>3:00 PM</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-medical-dark">Dr. Smith - General consultation</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4 hover:bg-red-50 transition-colors border-destructive/20">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-medical-dark">John Davis</h4>
                        <Badge variant="destructive">
                          Denied
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Dec 23, 2024</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>11:00 AM</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-sm">
                        <FileText className="w-4 h-4 text-destructive" />
                        <span className="text-destructive">Reason: Schedule conflict, please reschedule</span>
                      </div>
                    </div>
                    <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
                      Reschedule
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span>Clinic Schedule</span>
                </CardTitle>
                <CardDescription>
                  View all appointments across all doctors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Master Calendar</p>
                  <p className="text-sm">Complete clinic schedule view coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};