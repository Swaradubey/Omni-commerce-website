import React from 'react';
import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';

interface DeleteConfirmModalProps {
  open: boolean;
  productName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  open,
  productName,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl border-none shadow-2xl bg-white dark:bg-zinc-900">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/20">
              <XCircle className="h-6 w-6 text-rose-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Delete Product</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-rose-50/60 dark:bg-rose-900/10 border border-rose-200/50 dark:border-rose-800/30 p-4"
        >
          <p className="text-sm text-foreground">
            Are you sure you want to delete{' '}
            <span className="font-bold">&quot;{productName}&quot;</span>? All associated
            inventory data will be permanently removed.
          </p>
        </motion.div>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="rounded-xl h-11 px-6 border-gray-200 dark:border-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="rounded-xl h-11 px-6 bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700 shadow-lg shadow-rose-500/20"
          >
            Delete Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
