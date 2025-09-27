import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, User, Calendar, Clock } from 'lucide-react';
import sayalLogo from '@/assets/sayal-clinic-logo.png';
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
  return <div className="min-h-screen bg-gradient-to-br from-medical-light via-background to-accent/20">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 shadow-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <img src={sayalLogo} alt="Sayal Clinic" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">Sayal Clinic</h1>
                <p className="text-xs text-muted-foreground">Appointment Management</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Card className="px-3 py-2 bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-primary" />
                  <div className="text-sm">
                    <p className="font-medium text-medical-dark">{profile?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
                  </div>
                </div>
              </Card>
              
              <Button variant="outline" size="sm" onClick={handleSignOut} className="border-medical-accent text-primary hover:bg-medical-light">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Quick Stats Footer */}
      <footer className="bg-card/60 backdrop-blur-sm border-t border-border/50 mt-auto">
        
      </footer>
    </div>;
};