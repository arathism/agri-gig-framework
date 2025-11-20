"use client"

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sprout, Plus, Clock, CheckCircle, Award, MapPin, AlertCircle, Image as ImageIcon, Home, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

type JobStatus = 'open' | 'inProgress' | 'completed' | 'verified';

interface MicroGig {
  id: number;
  farmerId: number;
  taskName: string;
  description: string;
  category: string;
  location: string;
  reward: number;
  duration: number;
  requirements: string | null;
  status: JobStatus;
  createdAt: string;
  applicants?: number;
  proofUploaded?: boolean;
}

export default function FarmerDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [jobs, setJobs] = useState<MicroGig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Using mock farmer ID - in production, get from auth session
  const FARMER_ID = 1;

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks?farmer_id=${FARMER_ID}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      
      // Fetch applications count for each task
      const jobsWithApplicants = await Promise.all(
        data.map(async (job: MicroGig) => {
          const appsResponse = await fetch(`/api/applications?task_id=${job.id}`);
          const apps = await appsResponse.json();
          
          // Check if proof uploaded
          const proofsResponse = await fetch(`/api/task-proofs?task_id=${job.id}`);
          const proofs = await proofsResponse.json();
          
          return {
            ...job,
            applicants: apps.length,
            proofUploaded: proofs.length > 0
          };
        })
      );
      
      setJobs(jobsWithApplicants);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const onSubmit = async (data: any) => {
    try {
      setIsCreating(true);
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId: FARMER_ID,
          taskName: data.taskName,
          description: data.description,
          category: data.category,
          location: data.location,
          reward: parseFloat(data.reward),
          duration: parseFloat(data.duration),
          requirements: data.requirements || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create task');
      }

      toast.success('Task created successfully!');
      setIsCreateDialogOpen(false);
      reset();
      fetchJobs(); // Refresh list
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (status: JobStatus) => {
    const statusConfig = {
      open: { label: t.farmer.status.open, variant: 'default' as const },
      inProgress: { label: t.farmer.status.inProgress, variant: 'secondary' as const },
      completed: { label: t.farmer.status.completed, variant: 'outline' as const },
      verified: { label: t.farmer.status.verified, variant: 'default' as const }
    };
    
    return <Badge variant={statusConfig[status].variant}>{statusConfig[status].label}</Badge>;
  };

  const handleVerify = async (jobId: number) => {
    try {
      // Verify the proof
      const proofsResponse = await fetch(`/api/task-proofs?task_id=${jobId}`);
      const proofs = await proofsResponse.json();
      
      if (proofs.length === 0) {
        toast.error('No proof found to verify');
        return;
      }

      const verifyResponse = await fetch(`/api/task-proofs/${proofs[0].id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: true })
      });

      if (!verifyResponse.ok) throw new Error('Failed to verify proof');

      // Update task status to verified
      const taskResponse = await fetch(`/api/tasks/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'verified' })
      });

      if (!taskResponse.ok) throw new Error('Failed to update task status');

      toast.success('Task verified and reward approved!');
      fetchJobs(); // Refresh list
    } catch (error) {
      console.error('Error verifying task:', error);
      toast.error('Failed to verify task');
    }
  };

  const stats = {
    activeJobs: jobs.filter(j => j.status === 'open' || j.status === 'inProgress').length,
    pendingVerification: jobs.filter(j => j.status === 'completed').length,
    rewardsDistributed: jobs.filter(j => j.status === 'verified').reduce((sum, j) => sum + j.reward, 0)
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white dark:bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                <Home className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Sprout className="h-8 w-8 text-green-600" />
                <span className="text-2xl font-bold">{t.farmer.title}</span>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.farmer.activeJobs}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeJobs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.farmer.pendingVerification}</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingVerification}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.farmer.rewardsDistributed}</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.rewardsDistributed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Create Job Button */}
        <div className="mb-6">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-5 w-5" />
                {t.farmer.createJob}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t.farmer.jobForm.title}</DialogTitle>
                <DialogDescription>
                  {t.farmer.jobForm.dialogDescription}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taskName">{t.farmer.jobForm.taskName}</Label>
                  <Input
                    id="taskName"
                    placeholder={t.farmer.jobForm.taskNamePlaceholder}
                    {...register('taskName', { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t.farmer.jobForm.description}</Label>
                  <Textarea
                    id="description"
                    placeholder={t.farmer.jobForm.descriptionPlaceholder}
                    {...register('description', { required: true })}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">{t.farmer.jobForm.category}</Label>
                    <select
                      id="category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      {...register('category', { required: true })}
                    >
                      <option value="">{t.farmer.jobForm.categoryPlaceholder}</option>
                      <option value="soilPrep">{t.farmer.categories.soilPrep}</option>
                      <option value="planting">{t.farmer.categories.planting}</option>
                      <option value="weeding">{t.farmer.categories.weeding}</option>
                      <option value="irrigation">{t.farmer.categories.irrigation}</option>
                      <option value="fertilizing">{t.farmer.categories.fertilizing}</option>
                      <option value="pestControl">{t.farmer.categories.pestControl}</option>
                      <option value="harvesting">{t.farmer.categories.harvesting}</option>
                      <option value="composting">{t.farmer.categories.composting}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">{t.farmer.jobForm.location}</Label>
                    <Input
                      id="location"
                      placeholder={t.farmer.jobForm.locationPlaceholder}
                      {...register('location', { required: true })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reward">{t.farmer.jobForm.reward}</Label>
                    <Input
                      id="reward"
                      type="number"
                      placeholder={t.farmer.jobForm.rewardPlaceholder}
                      {...register('reward', { required: true, min: 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">{t.farmer.jobForm.duration}</Label>
                    <Input
                      id="duration"
                      type="number"
                      step="0.5"
                      placeholder={t.farmer.jobForm.durationPlaceholder}
                      {...register('duration', { required: true, min: 0.5 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">{t.farmer.jobForm.requirements}</Label>
                  <Textarea
                    id="requirements"
                    placeholder={t.farmer.jobForm.requirementsPlaceholder}
                    {...register('requirements')}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    t.farmer.jobForm.createButton
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">{t.farmer.activeJobs}</h2>
          {jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No tasks created yet</p>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{job.taskName}</CardTitle>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {job.duration}{t.farmer.jobDetails.hours}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(job.status)}
                      <span className="text-2xl font-bold text-green-600">₹{job.reward}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{job.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{job.applicants || 0} {t.farmer.jobDetails.applicants}</span>
                      {job.proofUploaded && (
                        <Badge variant="secondary" className="gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {t.farmer.verification.proofUploaded}
                        </Badge>
                      )}
                    </div>
                    {job.status === 'completed' && job.proofUploaded && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {}}
                        >
                          {t.farmer.verification.viewProof}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleVerify(job.id)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {t.farmer.verification.approve}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}