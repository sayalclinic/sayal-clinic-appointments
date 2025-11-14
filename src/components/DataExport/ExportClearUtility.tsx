import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const ExportClearUtility = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: 'No Data',
        description: `No ${filename} data to export`,
        variant: 'destructive',
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header] || '';
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      // Export Patients
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (patientsError) throw patientsError;
      if (patients) downloadCSV(patients, 'patients');

      // Export Appointments with patient names
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (name),
          profiles!appointments_doctor_id_fkey (name)
        `)
        .order('appointment_date', { ascending: false });

      if (appointmentsError) throw appointmentsError;
      if (appointments) {
        const formattedAppointments = appointments.map(apt => ({
          ...apt,
          patient_name: apt.patients?.name || apt.patient_name,
          doctor_name: apt.profiles?.name || 'Unknown',
        }));
        downloadCSV(formattedAppointments, 'appointments');
      }

      // Export Payments with calculated totals
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          appointments (
            patient_name,
            patients (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      if (payments) {
        const formattedPayments = payments.map(payment => {
          const appointmentFee = Number(payment.appointment_fee || 0);
          const testPaymentsArray = payment.test_payments as any;
          const testTotal = Array.isArray(testPaymentsArray)
            ? testPaymentsArray.reduce((sum: number, test: any) => sum + Number(test.amount || 0), 0)
            : 0;
          const testNames = Array.isArray(testPaymentsArray)
            ? testPaymentsArray.map((t: any) => t.test_name).join(', ')
            : '';

          return {
            id: payment.id,
            appointment_id: payment.appointment_id,
            patient_name: payment.appointments?.patients?.name || payment.appointments?.patient_name || 'Unknown',
            appointment_fee: appointmentFee,
            tests_done: testNames,
            test_total: testTotal,
            total_amount: appointmentFee + testTotal,
            payment_method: payment.payment_method,
            created_at: payment.created_at,
          };
        });
        downloadCSV(formattedPayments, 'payments');
      }

      toast({
        title: 'Export Complete',
        description: 'All data has been exported to CSV files',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      // Delete in order: payments → appointments → patients
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (paymentsError) throw paymentsError;

      const { error: appointmentsError } = await supabase
        .from('appointments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (appointmentsError) throw appointmentsError;

      const { error: patientsError } = await supabase
        .from('patients')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (patientsError) throw patientsError;

      toast({
        title: 'Data Cleared',
        description: 'All appointments, patients, and payments have been deleted',
      });

      // Refresh the page
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Clear data error:', error);
      toast({
        title: 'Clear Failed',
        description: 'Failed to clear data',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
      setShowClearDialog(false);
    }
  };

  return (
    <>
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export & Clear Data
          </CardTitle>
          <CardDescription>
            Export all data to CSV files before starting fresh
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleExportAll}
            disabled={isExporting}
            className="w-full"
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export All Data to CSV'}
          </Button>

          <Button
            onClick={() => setShowClearDialog(true)}
            disabled={isClearing}
            className="w-full"
            variant="destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Data
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            ⚠️ Export data first! Clearing is permanent and cannot be undone.
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Clear All Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All patients</li>
                <li>All appointments</li>
                <li>All payment records</li>
              </ul>
              <p className="text-destructive font-semibold mt-3">
                This action CANNOT be undone!
              </p>
              <p className="text-xs mt-2">
                Make sure you've exported the data first.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              disabled={isClearing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isClearing ? 'Clearing...' : 'Yes, Clear All Data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
