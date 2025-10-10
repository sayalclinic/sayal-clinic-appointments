import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  expectedPin?: string;
}

export const PinDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  title = "Enter PIN",
  description = "Please enter your 4-digit PIN to continue",
  expectedPin = "1978"
}: PinDialogProps) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (pin === expectedPin) {
      setPin('');
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setPin('');
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow numbers and max 4 digits
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(numericValue);
    setError(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            placeholder="Enter 4-digit PIN"
            className={`text-center text-2xl tracking-widest ${error ? 'border-destructive' : ''}`}
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && pin.length === 4 && handleSubmit()}
          />
          {error && (
            <p className="text-sm text-destructive text-center">Incorrect PIN. Please try again.</p>
          )}
          <Button 
            onClick={handleSubmit} 
            disabled={pin.length !== 4}
            className="w-full"
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
