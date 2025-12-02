import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CreditCard, IndianRupee, TestTube2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppointments } from '@/hooks/useAppointments';

const paymentSchema = z.object({
  appointmentFee: z.number().min(0, 'Appointment fee must be 0 or greater'),
  paymentMethod: z.string().min(1, 'Please select a payment method'),
  testsDone: z.string().optional(),
  testPayments: z.record(z.number()).optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  appointmentId: string;
  patientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const PaymentDialog = ({
  appointmentId,
  patientName,
  open,
  onOpenChange,
  onSuccess,
}: PaymentDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [testAmounts, setTestAmounts] = useState<Record<string, number>>({});
  const { createPayment } = useAppointments();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      appointmentFee: 0,
      paymentMethod: '',
      testsDone: '',
      testPayments: {},
    },
  });

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Credit/Debit Card' },
    { value: 'google_pay', label: 'Google Pay' },
    { value: 'paytm', label: 'Paytm' },
    { value: 'phonepe', label: 'PhonePe' },
  ];

  const labTestOptions = [
    'ECG',
    'PFT',
    'Dressings',
    'Nebulization',
    'Labs',
    'Injections',
  ];

  const onSubmit = async (data: PaymentFormData) => {
    setIsLoading(true);
    
    try {
      // Build test payments array
      const testPaymentsArray = selectedTests.map(testName => ({
        test_name: testName,
        amount: testAmounts[testName] || 0
      }));

      // Create payment record
      await createPayment({
        appointment_id: appointmentId,
        appointment_fee: data.appointmentFee,
        test_payments: testPaymentsArray,
        payment_method: data.paymentMethod,
      });

      form.reset();
      setSelectedTests([]);
      setTestAmounts({});
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating payment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span>Record Payment</span>
          </DialogTitle>
          <DialogDescription>
            Record payment for {patientName}'s appointment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appointmentFee">Appointment Fee (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="appointmentFee"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-10"
                {...form.register('appointmentFee', { valueAsNumber: true })}
              />
            </div>
            {form.formState.errors.appointmentFee && (
              <p className="text-sm text-destructive">
                {form.formState.errors.appointmentFee.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select onValueChange={(value) => form.setValue('paymentMethod', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.paymentMethod && (
              <p className="text-sm text-destructive">
                {form.formState.errors.paymentMethod.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <Label className="flex items-center space-x-2">
              <TestTube2 className="w-4 h-4" />
              <span>Lab Tests Performed</span>
            </Label>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {labTestOptions.map((test) => (
                <div key={test} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={test}
                      checked={selectedTests.includes(test)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTests([...selectedTests, test]);
                        } else {
                          setSelectedTests(selectedTests.filter(t => t !== test));
                          const newAmounts = { ...testAmounts };
                          delete newAmounts[test];
                          setTestAmounts(newAmounts);
                        }
                      }}
                    />
                    <Label htmlFor={test} className="text-sm font-medium flex-1">
                      {test}
                    </Label>
                  </div>
                  {selectedTests.includes(test) && (
                    <div className="ml-6">
                      <Label htmlFor={`${test}-amount`} className="text-xs text-muted-foreground">
                        Amount (₹)
                      </Label>
                      <Input
                        id={`${test}-amount`}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={testAmounts[test] || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setTestAmounts({ ...testAmounts, [test]: value });
                        }}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="testsDone">Additional Tests/Notes</Label>
              <Textarea
                id="testsDone"
                placeholder="Any additional tests or notes..."
                rows={2}
                {...form.register('testsDone')}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-primary to-medical-blue hover:from-primary-hover hover:to-primary text-primary-foreground"
              disabled={isLoading}
            >
              {isLoading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};