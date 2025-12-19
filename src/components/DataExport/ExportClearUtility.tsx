import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import JSZip from 'jszip';

const CLEAR_PASSWORD = '1978';

export const ExportClearUtility = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [passwordAttempt, setPasswordAttempt] = useState(0);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return '""';
            const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            return `"${strValue.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');
    return csvContent;
  };

  const getDateRange = (appointments: any[], payments: any[]): { start: string; end: string } => {
    const allDates: Date[] = [];
    
    appointments.forEach(apt => {
      if (apt.appointment_date) allDates.push(new Date(apt.appointment_date));
      if (apt.created_at) allDates.push(new Date(apt.created_at));
    });
    
    payments.forEach(payment => {
      if (payment.created_at) allDates.push(new Date(payment.created_at));
    });

    if (allDates.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      return { start: today, end: today };
    }

    const sortedDates = allDates.sort((a, b) => a.getTime() - b.getTime());
    return {
      start: sortedDates[0].toISOString().split('T')[0],
      end: sortedDates[sortedDates.length - 1].toISOString().split('T')[0],
    };
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();

      // Fetch all patients
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: true });
      if (patientsError) throw patientsError;

      // Fetch all appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: true });
      if (appointmentsError) throw appointmentsError;

      // Fetch all payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: true });
      if (paymentsError) throw paymentsError;

      // Add CSV files to ZIP
      if (patients && patients.length > 0) {
        zip.file('patients.csv', convertToCSV(patients));
      }
      if (appointments && appointments.length > 0) {
        zip.file('appointments.csv', convertToCSV(appointments));
      }
      if (payments && payments.length > 0) {
        zip.file('payments.csv', convertToCSV(payments));
      }

      // Get date range for filename
      const dateRange = getDateRange(appointments || [], payments || []);
      const zipFileName = `Appointment_Manager_Data_${dateRange.start}_to_${dateRange.end}.zip`;

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = zipFileName;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({
        title: 'Export Complete',
        description: `Downloaded ${zipFileName}`,
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

    // Parse headers
    const headers = parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const obj: any = {};
      headers.forEach((header, index) => {
        let value = values[index];
        if (value === '' || value === '""') {
          obj[header] = null;
        } else {
          // Try to parse JSON for complex objects
          try {
            if (value && (value.startsWith('[') || value.startsWith('{'))) {
              obj[header] = JSON.parse(value);
            } else {
              obj[header] = value;
            }
          } catch {
            obj[header] = value;
          }
        }
      });
      data.push(obj);
    }
    return data;
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const handleImportZip = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a ZIP file',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    try {
      const zip = await JSZip.loadAsync(file);
      let importedCounts = { patients: 0, appointments: 0, payments: 0 };

      // Import patients first (they're referenced by appointments)
      const patientsFile = zip.file('patients.csv');
      if (patientsFile) {
        const patientsText = await patientsFile.async('text');
        const patients = parseCSV(patientsText);
        for (const patient of patients) {
          // Check if patient already exists
          const { data: existing } = await supabase
            .from('patients')
            .select('id')
            .eq('id', patient.id)
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase.from('patients').insert({
              id: patient.id,
              name: patient.name,
              age: parseInt(patient.age) || 0,
              contact_no: patient.contact_no,
              medical_history: patient.medical_history,
              allergies: patient.allergies,
              blood_type: patient.blood_type,
              gender: patient.gender,
              location: patient.location,
              current_medications: patient.current_medications,
              emergency_contact_name: patient.emergency_contact_name,
              emergency_contact_phone: patient.emergency_contact_phone,
              insurance_info: patient.insurance_info,
              created_at: patient.created_at,
              updated_at: patient.updated_at,
            });
            if (error) console.error('Patient insert error:', error);
            else importedCounts.patients++;
          }
        }
      }

      // Import appointments
      const appointmentsFile = zip.file('appointments.csv');
      if (appointmentsFile) {
        const appointmentsText = await appointmentsFile.async('text');
        const appointments = parseCSV(appointmentsText);
        for (const apt of appointments) {
          const { data: existing } = await supabase
            .from('appointments')
            .select('id')
            .eq('id', apt.id)
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase.from('appointments').insert({
              id: apt.id,
              patient_id: apt.patient_id,
              doctor_id: apt.doctor_id,
              receptionist_id: apt.receptionist_id,
              appointment_date: apt.appointment_date,
              appointment_time: apt.appointment_time,
              status: apt.status || 'pending',
              reason_for_visit: apt.reason_for_visit,
              symptoms: apt.symptoms,
              patient_name: apt.patient_name,
              is_repeat: apt.is_repeat === 'true' || apt.is_repeat === true,
              previous_appointment_id: apt.previous_appointment_id,
              requires_payment: apt.requires_payment === 'true' || apt.requires_payment === true || apt.requires_payment === null,
              denial_reason: apt.denial_reason,
              created_at: apt.created_at,
              updated_at: apt.updated_at,
            });
            if (error) console.error('Appointment insert error:', error);
            else importedCounts.appointments++;
          }
        }
      }

      // Import payments
      const paymentsFile = zip.file('payments.csv');
      if (paymentsFile) {
        const paymentsText = await paymentsFile.async('text');
        const payments = parseCSV(paymentsText);
        for (const payment of payments) {
          const { data: existing } = await supabase
            .from('payments')
            .select('id')
            .eq('id', payment.id)
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase.from('payments').insert({
              id: payment.id,
              appointment_id: payment.appointment_id,
              appointment_fee: parseFloat(payment.appointment_fee) || 0,
              test_payments: payment.test_payments || [],
              payment_method: payment.payment_method,
              labs_payment_method: payment.labs_payment_method,
              created_at: payment.created_at,
            });
            if (error) console.error('Payment insert error:', error);
            else importedCounts.payments++;
          }
        }
      }

      toast({
        title: 'Import Complete',
        description: `Imported ${importedCounts.patients} patients, ${importedCounts.appointments} appointments, ${importedCounts.payments} payments`,
      });

      // Refresh after import
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: 'Failed to import data. Check ZIP file format.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearDataClick = () => {
    setPasswordAttempt(0);
    setPasswordInput('');
    setPasswordError('');
    setClearDialogOpen(true);
  };

  const handlePasswordSubmit = async () => {
    if (passwordInput !== CLEAR_PASSWORD) {
      setPasswordError('Incorrect password');
      setPasswordInput('');
      return;
    }

    setPasswordError('');
    setPasswordInput('');
    const nextAttempt = passwordAttempt + 1;
    setPasswordAttempt(nextAttempt);

    if (nextAttempt >= 3) {
      // All 3 passwords correct, proceed with clearing
      setClearDialogOpen(false);
      await clearAllData();
    }
  };

  const clearAllData = async () => {
    setIsClearing(true);
    try {
      // Delete in correct order due to foreign key constraints
      // 1. Delete payments first (references appointments)
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      if (paymentsError) throw paymentsError;

      // 2. Delete appointments (references patients)
      const { error: appointmentsError } = await supabase
        .from('appointments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (appointmentsError) throw appointmentsError;

      // 3. Delete patients
      const { error: patientsError } = await supabase
        .from('patients')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (patientsError) throw patientsError;

      toast({
        title: 'Data Cleared',
        description: 'All patients, appointments, and payments have been removed. User accounts are preserved.',
      });

      // Refresh after clearing
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
    }
  };

  const getPasswordDialogTitle = () => {
    const attempts = ['First', 'Second', 'Third'];
    return `${attempts[passwordAttempt]} Password Confirmation`;
  };

  const getPasswordDialogDescription = () => {
    const remaining = 3 - passwordAttempt;
    return `Enter the password to confirm data deletion. ${remaining} confirmation${remaining > 1 ? 's' : ''} remaining.`;
  };

  return (
    <>
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export all data as ZIP, import from ZIP, or clear all data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Download ZIP Button */}
          <div>
            <Button
              onClick={handleExportZip}
              disabled={isExporting}
              className="w-full"
              size="lg"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Creating ZIP...' : 'Download All Data (ZIP)'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Downloads a ZIP file with patients, appointments, and payments
            </p>
          </div>

          {/* Upload ZIP */}
          <div className="space-y-2">
            <Label htmlFor="zip-upload" className="text-sm font-medium">
              Upload Data from ZIP
            </Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                id="zip-upload"
                type="file"
                accept=".zip"
                onChange={handleImportZip}
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
                {isImporting ? 'Importing...' : 'Upload ZIP'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a previously exported ZIP file to restore data
            </p>
          </div>

          {/* Clear Data Button */}
          <div className="pt-4 border-t border-destructive/20">
            <Button
              onClick={handleClearDataClick}
              disabled={isClearing}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isClearing ? 'Clearing Data...' : 'Remove Current Data'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Removes all patients, appointments, and payments. User accounts are kept.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Password Confirmation Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {getPasswordDialogTitle()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getPasswordDialogDescription()}
              <br />
              <span className="text-destructive font-medium">
                This action cannot be undone. All data will be permanently deleted.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="clear-password">Password</Label>
            <Input
              id="clear-password"
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePasswordSubmit();
              }}
              placeholder="Enter password"
              className="mt-2"
            />
            {passwordError && (
              <p className="text-sm text-destructive mt-2">{passwordError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClearDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handlePasswordSubmit}
              variant="destructive"
            >
              Confirm ({passwordAttempt + 1}/3)
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
