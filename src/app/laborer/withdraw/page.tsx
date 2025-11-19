"use client"

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wallet, ArrowLeft, CheckCircle, AlertCircle, Calendar, User, Sprout } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Task = {
  id: string;
  taskName: string;
  description: string;
  category: string;
  location: string;
  reward: number;
  farmerName: string;
  completedDate: string;
  verifiedDate: string;
  status: 'verified';
};

type PaymentMethod = 'bank' | 'upi';

interface WithdrawalFormData {
  amount: string;
  paymentMethod: PaymentMethod;
  // Bank details
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  // UPI details
  upiId: string;
}

export default function WithdrawCreditsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank');
  
  const [formData, setFormData] = useState<WithdrawalFormData>({
    amount: '',
    paymentMethod: 'bank',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    upiId: ''
  });

  // Mock verified tasks data
  const verifiedTasks: Task[] = [
    {
      id: '1',
      taskName: 'Organic Weeding - North Field',
      description: 'Removed weeds from 2 acres using manual methods. Followed organic farming practices.',
      category: 'Weeding',
      location: 'Bangalore Rural, Karnataka',
      reward: 500,
      farmerName: 'Ramesh Kumar',
      completedDate: '2024-11-15',
      verifiedDate: '2024-11-16',
      status: 'verified'
    },
    {
      id: '2',
      taskName: 'Drip Irrigation Maintenance',
      description: 'Checked and cleaned drip irrigation system, replaced damaged pipes in 3 zones.',
      category: 'Irrigation',
      location: 'Bangalore Rural, Karnataka',
      reward: 400,
      farmerName: 'Lakshmi Devi',
      completedDate: '2024-11-14',
      verifiedDate: '2024-11-15',
      status: 'verified'
    },
    {
      id: '3',
      taskName: 'Compost Preparation',
      description: 'Prepared 500kg organic compost from farm waste using proper layering technique.',
      category: 'Composting',
      location: 'Bangalore Rural, Karnataka',
      reward: 300,
      farmerName: 'Suresh Patil',
      completedDate: '2024-11-12',
      verifiedDate: '2024-11-13',
      status: 'verified'
    },
    {
      id: '4',
      taskName: 'Natural Pest Control Application',
      description: 'Applied neem-based pest control solution to 1.5 acres of vegetable crops.',
      category: 'Pest Control',
      location: 'Bangalore Rural, Karnataka',
      reward: 350,
      farmerName: 'Gowda',
      completedDate: '2024-11-10',
      verifiedDate: '2024-11-11',
      status: 'verified'
    },
    {
      id: '5',
      taskName: 'Soil Testing & Analysis',
      description: 'Collected soil samples from 5 different zones and conducted pH testing.',
      category: 'Soil Preparation',
      location: 'Bangalore Rural, Karnataka',
      reward: 250,
      farmerName: 'Ramesh Kumar',
      completedDate: '2024-11-08',
      verifiedDate: '2024-11-09',
      status: 'verified'
    }
  ];

  const availableBalance = verifiedTasks.reduce((sum, task) => sum + task.reward, 0);
  const minimumWithdrawal = 100;

  const handleInputChange = (field: keyof WithdrawalFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleWithdrawalSubmit = () => {
    const amount = parseFloat(formData.amount);

    // Validation
    if (!formData.amount || isNaN(amount)) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < minimumWithdrawal) {
      toast.error(t.laborer.withdrawal.messages.belowMinimum);
      return;
    }

    if (amount > availableBalance) {
      toast.error(t.laborer.withdrawal.messages.insufficientBalance);
      return;
    }

    if (paymentMethod === 'bank') {
      if (!formData.accountHolderName || !formData.accountNumber || !formData.ifscCode || !formData.bankName) {
        toast.error('Please fill in all bank details');
        return;
      }
    } else {
      if (!formData.upiId) {
        toast.error('Please enter your UPI ID');
        return;
      }
    }

    // Success
    toast.success(t.laborer.withdrawal.messages.requestSuccess);
    setIsWithdrawalDialogOpen(false);
    
    // Reset form
    setFormData({
      amount: '',
      paymentMethod: 'bank',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      upiId: ''
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white dark:bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/laborer')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Wallet className="h-8 w-8 text-green-600" />
                <span className="text-2xl font-bold">{t.laborer.withdrawal.title}</span>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Balance Card */}
        <Card className="mb-8 border-2 border-green-500 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-green-600" />
              {t.laborer.withdrawal.availableBalance}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-5xl font-bold text-green-600">₹{availableBalance}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {t.laborer.withdrawal.minimumWithdrawal}
                </p>
              </div>
              <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-green-600 hover:bg-green-700">
                    <Wallet className="mr-2 h-5 w-5" />
                    {t.laborer.withdrawal.requestWithdrawal}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t.laborer.withdrawal.form.title}</DialogTitle>
                    <DialogDescription>
                      {t.laborer.withdrawal.form.description}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Amount */}
                    <div className="space-y-2">
                      <Label htmlFor="amount">{t.laborer.withdrawal.form.amount}</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder={t.laborer.withdrawal.form.amountPlaceholder}
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        min={minimumWithdrawal}
                        max={availableBalance}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.laborer.withdrawal.availableBalance}: ₹{availableBalance}
                      </p>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <Label>{t.laborer.withdrawal.form.paymentMethod}</Label>
                      <RadioGroup 
                        value={paymentMethod} 
                        onValueChange={(value) => {
                          setPaymentMethod(value as PaymentMethod);
                          setFormData(prev => ({ ...prev, paymentMethod: value as PaymentMethod }));
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="bank" id="bank" />
                          <Label htmlFor="bank" className="cursor-pointer">
                            {t.laborer.withdrawal.form.bankAccount}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="upi" id="upi" />
                          <Label htmlFor="upi" className="cursor-pointer">
                            {t.laborer.withdrawal.form.upiId}
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Bank Account Details */}
                    {paymentMethod === 'bank' && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <div className="space-y-2">
                          <Label htmlFor="accountHolderName">
                            {t.laborer.withdrawal.form.accountHolderName}
                          </Label>
                          <Input
                            id="accountHolderName"
                            placeholder={t.laborer.withdrawal.form.accountHolderPlaceholder}
                            value={formData.accountHolderName}
                            onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">
                            {t.laborer.withdrawal.form.accountNumber}
                          </Label>
                          <Input
                            id="accountNumber"
                            placeholder={t.laborer.withdrawal.form.accountNumberPlaceholder}
                            value={formData.accountNumber}
                            onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="ifscCode">
                            {t.laborer.withdrawal.form.ifscCode}
                          </Label>
                          <Input
                            id="ifscCode"
                            placeholder={t.laborer.withdrawal.form.ifscPlaceholder}
                            value={formData.ifscCode}
                            onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bankName">
                            {t.laborer.withdrawal.form.bankName}
                          </Label>
                          <Input
                            id="bankName"
                            placeholder={t.laborer.withdrawal.form.bankPlaceholder}
                            value={formData.bankName}
                            onChange={(e) => handleInputChange('bankName', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* UPI Details */}
                    {paymentMethod === 'upi' && (
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                        <Label htmlFor="upiId">
                          {t.laborer.withdrawal.form.upiIdLabel}
                        </Label>
                        <Input
                          id="upiId"
                          placeholder={t.laborer.withdrawal.form.upiIdPlaceholder}
                          value={formData.upiId}
                          onChange={(e) => handleInputChange('upiId', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Example: yourname@paytm, yourname@gpay
                        </p>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setIsWithdrawalDialogOpen(false)}
                      >
                        {t.laborer.withdrawal.form.cancelButton}
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={handleWithdrawalSubmit}
                      >
                        {t.laborer.withdrawal.form.submitButton}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Task History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {t.laborer.withdrawal.taskHistory}
            </CardTitle>
            <CardDescription>
              {verifiedTasks.length} {verifiedTasks.length === 1 ? 'task' : 'tasks'} completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verifiedTasks.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{t.laborer.withdrawal.noTasks}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.laborer.withdrawal.table.taskName}</TableHead>
                        <TableHead>{t.laborer.withdrawal.table.farmer}</TableHead>
                        <TableHead>{t.laborer.withdrawal.table.completedDate}</TableHead>
                        <TableHead>{t.laborer.withdrawal.table.verifiedDate}</TableHead>
                        <TableHead className="text-right">{t.laborer.withdrawal.table.reward}</TableHead>
                        <TableHead>{t.laborer.withdrawal.table.status}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {verifiedTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{task.taskName}</div>
                              <div className="text-sm text-muted-foreground">{task.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {task.farmerName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDate(task.completedDate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDate(task.verifiedDate)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-green-600">₹{task.reward}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-600">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              {t.farmer.status.verified}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {verifiedTasks.map((task) => (
                    <Card key={task.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{task.taskName}</CardTitle>
                            <CardDescription className="text-sm mt-1">
                              {task.description}
                            </CardDescription>
                          </div>
                          <Badge className="bg-green-600 ml-2">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            {t.farmer.status.verified}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            {task.farmerName}
                          </span>
                          <span className="font-bold text-green-600 text-lg">₹{task.reward}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Completed: {formatDate(task.completedDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified: {formatDate(task.verifiedDate)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
