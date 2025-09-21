import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CreditCard, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppointments } from '@/hooks/useAppointments';

const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.string().min(1, 'Please select a payment method'),
  testsDone: z.string().optional(),
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
  const { createPayment } = useAppointments();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: '',
      testsDone: '',
    },
  });

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Credit/Debit Card' },
    { value: 'upi', label: 'UPI' },
    { value: 'google_pay', label: 'Google Pay' },
    { value: 'paytm', label: 'Paytm' },
    { value: 'phonepe', label: 'PhonePe' },
  ];

  const onSubmit = async (data: PaymentFormData) => {
    setIsLoading(true);
    
    try {
      await createPayment({
        appointment_id: appointmentId,
        amount: data.amount,
        payment_method: data.paymentMethod,
        tests_done: data.testsDone || undefined,
      });

      form.reset();
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
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-10"
                {...form.register('amount', { valueAsNumber: true })}
              />
            </div>
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">
                {form.formState.errors.amount.message}
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

          <div className="space-y-2">
            <Label htmlFor="testsDone">Tests Done (Optional)</Label>
            <Textarea
              id="testsDone"
              placeholder="List any tests or procedures performed..."
              {...form.register('testsDone')}
            />
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