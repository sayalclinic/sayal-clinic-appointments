import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, LogIn, Stethoscope, Users, Calendar, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-light via-background to-medical-accent">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="pt-10 sm:pt-16 lg:pt-20">
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-r from-primary to-medical-blue rounded-2xl flex items-center justify-center mb-8 shadow-elevated">
                    <svg
                      className="w-10 h-10 text-primary-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </div>
                  
                  <h1 className="text-4xl font-bold tracking-tight text-medical-dark sm:text-5xl md:text-6xl">
                    <span className="block">Welcome to</span>
                    <span className="block text-primary">ClinicFlow</span>
                  </h1>
                  
                  <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground sm:text-lg md:mt-5 md:max-w-3xl md:text-xl">
                    Professional clinic appointment management system. Streamline your healthcare practice with efficient patient scheduling, doctor approvals, and comprehensive appointment tracking.
                  </p>
                  
                  <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
                    <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex">
                      <Button
                        onClick={() => navigate('/signup')}
                        className="w-full sm:w-auto bg-gradient-to-r from-primary to-medical-blue hover:from-primary-hover hover:to-primary text-primary-foreground font-medium px-8 py-3"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Get Started
                      </Button>
                      <Button
                        onClick={() => navigate('/signin')}
                        variant="outline"
                        className="w-full sm:w-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3"
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-medical-dark">
              Everything you need to manage your clinic
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Comprehensive features designed for modern healthcare practices
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="shadow-card hover:shadow-card-hover transition-shadow border-0 bg-gradient-to-b from-card to-medical-light/30">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-medical-blue rounded-lg flex items-center justify-center mb-4">
                  <Stethoscope className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-medical-dark">Doctor Dashboard</CardTitle>
                <CardDescription>
                  Approve appointments, manage your schedule, and track patient consultations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card hover:shadow-card-hover transition-shadow border-0 bg-gradient-to-b from-card to-medical-light/30">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-medical-blue rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-medical-dark">Patient Management</CardTitle>
                <CardDescription>
                  Store patient details, medical history, and appointment records securely
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card hover:shadow-card-hover transition-shadow border-0 bg-gradient-to-b from-card to-medical-light/30">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-medical-blue rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-medical-dark">Smart Scheduling</CardTitle>
                <CardDescription>
                  Advanced appointment scheduling with conflict detection and notifications
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card hover:shadow-card-hover transition-shadow border-0 bg-gradient-to-b from-card to-medical-light/30">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-medical-blue rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-medical-dark">Role-Based Access</CardTitle>
                <CardDescription>
                  Secure access control for doctors and receptionists with appropriate permissions
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card hover:shadow-card-hover transition-shadow border-0 bg-gradient-to-b from-card to-medical-light/30">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-medical-blue rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <CardTitle className="text-medical-dark">Analytics & Reports</CardTitle>
                <CardDescription>
                  Track clinic performance, doctor earnings, and appointment statistics
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card hover:shadow-card-hover transition-shadow border-0 bg-gradient-to-b from-card to-medical-light/30">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-medical-blue rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5h5l-5 5-5-5h5V7.5A7.5 7.5 0 0115 0v5z" />
                  </svg>
                </div>
                <CardTitle className="text-medical-dark">Real-time Notifications</CardTitle>
                <CardDescription>
                  Instant notifications for appointment approvals, denials, and schedule changes
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
