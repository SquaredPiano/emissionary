import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  isOpen: boolean;
  title: ReactNode;
  description: ReactNode;
  onClose: (open: boolean) => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function Confirmation({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  onConfirm, 
  confirmText = "Confirm",
  cancelText = "Cancel"
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className={'flex flex-col gap-6'}>
          <DialogDescription>{description}</DialogDescription>
          <div className={'flex gap-4 items-center justify-end w-full'}>
            <Button onClick={() => onClose(false)} variant={'outline'}>
              {cancelText}
            </Button>
            <Button onClick={() => onConfirm()} variant={'destructive'}>
              {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
