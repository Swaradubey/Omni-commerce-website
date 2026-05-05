import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import ApiService from '../api/apiService';
import { toast } from 'sonner';
import { MessageSquare, Send, DollarSign, Package } from 'lucide-react';

interface QuoteRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  products: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    clientId?: string;
  }[];
  onSuccess?: () => void;
}

export function QuoteRequestDialog({ isOpen, onClose, products, onSuccess }: QuoteRequestDialogProps) {
  const [requestedPrice, setRequestedPrice] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestedPrice || isNaN(Number(requestedPrice))) {
      toast.error('Please enter a valid requested price');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find the first available clientId from products if any
      const topClientId = products.find(p => p.clientId)?.clientId;

      const response = await ApiService.post('/quotes', {
        products,
        clientId: topClientId, // Send top-level clientId if available
        originalTotal: totalOriginalPrice,
        requestedPrice: Number(requestedPrice),
        message
      }, { pageName: 'Quote' });

      if (response.success) {
        toast.success('Quote request submitted successfully!');
        setRequestedPrice('');
        setMessage('');
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.message || 'Failed to submit quote request');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while submitting your request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalOriginalPrice = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-stone-200">
        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center gap-3 text-2xl font-black text-[#1F1F1F]">
                <div className="p-3 bg-blue-50 rounded-2xl">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                Request a Quote
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Items in Quote</p>
                <div className="space-y-2">
                  {products.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-[#1F1F1F] truncate mr-2">{p.name}</span>
                      <span className="text-muted-foreground shrink-0">x{p.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">Original Total</span>
                  <span className="font-bold text-gray-900">₹{totalOriginalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestedPrice" className="text-xs font-bold uppercase tracking-wider">Your Expected Price (Total)</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    id="requestedPrice"
                    type="number"
                    placeholder="What's your best offer?"
                    className="pl-9 h-12 rounded-xl border-gray-200 focus:ring-blue-500/20"
                    value={requestedPrice}
                    onChange={(e) => setRequestedPrice(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Enter the total amount you're willing to pay for all items.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider">Message to Admin (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us why you deserve this price..."
                  className="min-h-[100px] rounded-xl border-gray-200 focus:ring-blue-500/20"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-gray-50 p-6 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 gap-2 shadow-lg shadow-blue-600/20"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
