import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';

export const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');

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
              <div className="text-2xl font-bold text-warning">3</div>
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
              <div className="text-2xl font-bold text-primary">7</div>
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
              <div className="text-2xl font-bold text-success">42</div>
              <p className="text-xs text-muted-foreground">
                Patients served this month
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
              <CardContent className="space-y-4">
                {/* Sample pending appointments */}
                <div className="border rounded-lg p-4 hover:bg-medical-light/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-medical-dark">Sarah Johnson</h4>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          Pending
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Dec 25, 2024</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>10:30 AM</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-medical-dark">Regular checkup, mild headaches</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 hover:bg-medical-light/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-medical-dark">Michael Chen</h4>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          Pending
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Dec 26, 2024</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>2:15 PM</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-medical-dark">Follow-up consultation, blood pressure monitoring</span>
                      </div>
                    </div>
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
                  <span>My Schedule</span>
                </CardTitle>
                <CardDescription>
                  View your confirmed appointments and daily schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Calendar view coming soon...</p>
                  <p className="text-sm">View your approved appointments in an interactive calendar</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};