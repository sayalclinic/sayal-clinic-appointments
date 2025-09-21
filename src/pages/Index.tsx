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
                        onClick={() => navigate('/user-selection')}
                        variant="outline"
                        className="w-full sm:w-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3"
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Quick Sign In
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

          {/* Remove the features section */}
    </div>
  );
};

export default Index;
