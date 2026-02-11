import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, User, Calendar, Clock } from 'lucide-react';
import clinicLogo from '@/assets/sayal-clinic-logo.png';
import patientMgmtLogo from '@/assets/patient-management-logo.png';
interface DashboardLayoutProps {
  children: ReactNode;
}
export const DashboardLayout = ({
  children
}: DashboardLayoutProps) => {
  const {
    profile,
    signOut
  } = useAuth();
  const handleSignOut = async () => {
    await signOut();
  };
  return <div className="min-h-screen clinic-gradient">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur-md border-b border-border shadow-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo Section */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 smooth-hover flex-shrink-0">
                <img src={clinicLogo} alt="Sayal Clinic Logo" className="w-full h-full object-contain" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-primary">Sayal Clinic</h1>
                <p className="text-xs text-muted-foreground">Appointment Manager</p>
              </div>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* User Profile Card - Hidden on small screens */}
              <Card className="hidden md:flex px-3 py-2 bg-card border border-border/50 shadow-sm">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{profile?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
                  </div>
                </div>
              </Card>
              
              {/* Mobile User Indicator */}
              <div className="md:hidden flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary/50">
                <User className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-foreground capitalize">{profile?.role}</span>
              </div>
              
              {/* Patient Management Button */}
              <a
                href="https://sayal-clinic-patients.lovable.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border hover:bg-secondary smooth-transition"
              >
                <img src={patientMgmtLogo} alt="Patient Management" className="w-7 h-7 object-contain" />
                <span className="hidden sm:inline text-xs font-medium text-foreground">Patients</span>
              </a>

              {/* Sign Out Button */}
              <Button variant="outline" size="sm" onClick={handleSignOut} className="smooth-button border-border hover:bg-secondary text-primary">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>

      {/* Footer - Hidden on mobile */}
      <footer className="hidden sm:block bg-card/70 backdrop-blur-sm border-t border-border/50 mt-8">
        
      </footer>
    </div>;
};