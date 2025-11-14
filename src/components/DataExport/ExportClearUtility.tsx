import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const ExportClearUtility = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || null;
      });
      data.push(obj);
    }
    return data;
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const fileName = file.name.toLowerCase();

      if (fileName.includes('patient')) {
        const patients = parseCSV(text);
        for (const patient of patients) {
          const { error } = await supabase.from('patients').insert({
            name: patient.name,
            age: parseInt(patient.age) || 0,
            contact_no: patient.contact_no,
            medical_history: patient.medical_history,
            allergies: patient.allergies,
            blood_type: patient.blood_type,
            gender: patient.gender,
            location: patient.location,
          });
          if (error) throw error;
        }
        toast({ title: 'Success', description: `Imported ${patients.length} patients` });
      } else if (fileName.includes('appointment')) {
        const appointments = parseCSV(text);
        for (const apt of appointments) {
          const { error } = await supabase.from('appointments').insert({
            patient_id: apt.patient_id,
            doctor_id: apt.doctor_id,
            receptionist_id: apt.receptionist_id,
            appointment_date: apt.appointment_date,
            appointment_time: apt.appointment_time,
            status: apt.status || 'pending',
            reason_for_visit: apt.reason_for_visit,
            symptoms: apt.symptoms,
          });
          if (error) throw error;
        }
        toast({ title: 'Success', description: `Imported ${appointments.length} appointments` });
      } else if (fileName.includes('payment')) {
        const payments = parseCSV(text);
        for (const payment of payments) {
          const testPayments = payment.test_payments ? JSON.parse(payment.test_payments) : [];
          const { error } = await supabase.from('payments').insert({
            appointment_id: payment.appointment_id,
            appointment_fee: parseFloat(payment.appointment_fee) || 0,
            test_payments: testPayments,
            payment_method: payment.payment_method,
          });
          if (error) throw error;
        }
        toast({ title: 'Success', description: `Imported ${payments.length} payments` });
      } else {
        toast({ 
          title: 'Invalid File', 
          description: 'Please upload a patients, appointments, or payments CSV file',
          variant: 'destructive' 
        });
      }

      // Refresh the page after import
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: 'Failed to import data. Check CSV format.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-background to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Data Management
        </CardTitle>
        <CardDescription>
          Export your data to CSV files or import data from CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Button
            onClick={handleExportAll}
            disabled={isExporting}
            className="w-full"
            size="lg"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export All Data to CSV'}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Downloads 3 files: patients, appointments, and payments
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="csv-upload" className="text-sm font-medium">
            Import Data from CSV
          </Label>
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              disabled={isImporting}
              className="cursor-pointer"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              variant="outline"
              className="shrink-0"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isImporting ? 'Importing...' : 'Upload'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            File name should contain: "patient", "appointment", or "payment"
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
