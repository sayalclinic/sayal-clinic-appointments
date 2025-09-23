import { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import sayalLogo from '@/assets/sayal-clinic-logo.png';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-medical-light via-background to-medical-accent p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-elevated border-0 bg-gradient-to-b from-card to-medical-light/30">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="mx-auto w-20 h-20 mb-4 flex items-center justify-center">
              <img 
                src={sayalLogo} 
                alt="Sayal Clinic" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">
              Sayal Clinic Appointments
            </h1>
            <h2 className="text-lg font-semibold text-medical-dark">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};