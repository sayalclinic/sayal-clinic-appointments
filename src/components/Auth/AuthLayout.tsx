import { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import clinicLogo from '@/assets/sayal-clinic-logo.png';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center clinic-gradient p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md">
        <Card className="shadow-elevated border border-border/50 smooth-transition hover:shadow-elevated">
          <CardHeader className="text-center space-y-3 pb-8 pt-8">
            <div className="mx-auto w-24 h-24 sm:w-28 sm:h-28 mb-4 smooth-hover">
              <img 
                src={clinicLogo} 
                alt="Sayal Clinic Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground">
                {subtitle}
              </p>
            )}
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-8">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};