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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Search, MapPin, Clock, Award, CheckCircle, Upload, Home, Camera, Wallet, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type TaskStatus = 'open' | 'inProgress' | 'completed' | 'verified';
type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'started' | 'completed';

interface Task {
  id: number;
  farmerId: number;
  taskName: string;
  description: string;
  category: string;
  location: string;
  reward: number;
  duration: number;
  requirements: string | null;
  status: TaskStatus;
  createdAt: string;
}

interface Application {
  id: number;
  taskId: number;
  laborerId: number;
  status: ApplicationStatus;
  appliedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  task: Task;
}

interface Gig extends Task {
  farmerName?: string;
  distance?: string;
  postedDate?: string;
  applicationStatus?: ApplicationStatus;
  applicationId?: number;
}

export default function LaborerDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [availableGigs, setAvailableGigs] = useState<Gig[]>([]);
  const [myApplications, setMyApplications] = useState<Gig[]>([]);
  const [proofNotes, setProofNotes] = useState('');
  const [proofPhotos, setProofPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Using mock laborer ID - in production, get from auth session
  const LABORER_ID = 2;

  const fetchAvailableGigs = async () => {
    try {
      const response = await fetch('/api/tasks?status=open');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const tasks: Task[] = await response.json();
      
      // Transform to Gig format
      const gigs: Gig[] = tasks.map(task => ({
        ...task,
        distance: '3.2 km', // Mock data - would come from geolocation in production
        postedDate: getRelativeTime(task.createdAt),
        farmerName: 'Farmer' // Mock - would be joined from users table
      }));
      
      setAvailableGigs(gigs);
    } catch (error) {
      console.error('Error fetching available gigs:', error);
      toast.error('Failed to load available tasks');
    }
  };

  const fetchMyApplications = async () => {
    try {
      const response = await fetch(`/api/applications?laborer_id=${LABORER_ID}`);
      if (!response.ok) throw new Error('Failed to fetch applications');
      const applications: Application[] = await response.json();
      
      // Transform to Gig format
      const gigs: Gig[] = applications.map(app => ({
        ...app.task,
        applicationStatus: app.status,
        applicationId: app.id,
        distance: '3.2 km',
        postedDate: getRelativeTime(app.appliedAt),
        farmerName: 'Farmer'
      }));
      
      setMyApplications(gigs);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load your applications');
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchAvailableGigs(), fetchMyApplications()]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Poll for updates every 30 seconds (reduced from 5 seconds to prevent reload loop)
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleApply = async (taskId: number) => {
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          laborerId: LABORER_ID
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === 'DUPLICATE_APPLICATION') {
          toast.error('You have already applied to this task');
        } else {
          throw new Error(error.error || 'Failed to apply');
        }
        return;
      }

      toast.success('Application submitted successfully!');
      fetchData(); // Refresh lists
    } catch (error) {
      console.error('Error applying:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to apply to task');
    }
  };

  const handleStartWork = async (applicationId: number) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'started' })
      });

      if (!response.ok) throw new Error('Failed to start work');

      toast.success('Work started! Good luck!');
      fetchData(); // Refresh lists
    } catch (error) {
      console.error('Error starting work:', error);
      toast.error('Failed to start work');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const newPhotos: string[] = [];
      
      for (let i = 0; i < Math.min(files.length, 5); i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Max size is 5MB`);
          continue;
        }
        
        // Convert to base64
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        
        newPhotos.push(base64);
      }
      
      setProofPhotos(prev => [...prev, ...newPhotos].slice(0, 5));
      toast.success(`${newPhotos.length} photo(s) added`);
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setProofPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitProof = async () => {
    if (!selectedGig || !selectedGig.applicationId) return;

    if (proofPhotos.length === 0) {
      toast.error('Please upload at least one photo as proof');
      return;
    }

    try {
      setIsSubmitting(true);

      // Submit proof
      const proofResponse = await fetch('/api/task-proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedGig.applicationId,
          taskId: selectedGig.id,
          laborerId: LABORER_ID,
          photos: proofPhotos,
          notes: proofNotes,
          locationLat: null,
          locationLng: null
        })
      });

      if (!proofResponse.ok) throw new Error('Failed to submit proof');

      // Update application status to completed
      const appResponse = await fetch(`/api/applications/${selectedGig.applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });

      if (!appResponse.ok) throw new Error('Failed to update application');

      toast.success('Proof submitted! Waiting for farmer verification.');
      setIsProofDialogOpen(false);
      setProofNotes('');
      setProofPhotos([]);
      fetchData(); // Refresh lists
    } catch (error) {
      console.error('Error submitting proof:', error);
      toast.error('Failed to submit proof');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusButton = (gig: Gig) => {
    // Check if already applied
    const hasApplication = myApplications.some(app => app.id === gig.id);
    
    if (hasApplication) {
      const application = myApplications.find(app => app.id === gig.id);
      
      switch (application?.applicationStatus) {
        case 'pending':
          return (
            <div className="flex gap-2">
              <Badge variant="secondary">{t.laborer.application.applied}</Badge>
              <Button 
                size="sm"
                onClick={() => application.applicationId && handleStartWork(application.applicationId)}
              >
                {t.laborer.application.startWork}
              </Button>
            </div>
          );
        case 'accepted':
        case 'started':
          return (
            <Button 
              onClick={() => {
                setSelectedGig(application);
                setIsProofDialogOpen(true);
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t.laborer.application.submitProof}
            </Button>
          );
        case 'completed':
          return <Badge variant="outline">Pending Verification</Badge>;
        default:
          return null;
      }
    }

    // Show apply button for available tasks
    if (gig.status === 'open') {
      return (
        <Button 
          className="bg-green-600 hover:bg-green-700"
          onClick={() => handleApply(gig.id)}
        >
          {t.laborer.application.applyButton}
        </Button>
      );
    }

    return null;
  };

  const stats = {
    totalEarnings: myApplications
      .filter(g => g.status === 'verified')
      .reduce((sum, g) => sum + g.reward, 0),
    completedTasks: myApplications.filter(g => g.status === 'verified').length,
    pendingVerification: myApplications.filter(g => g.applicationStatus === 'completed').length,
  };

  const filteredGigs = availableGigs.filter(gig => {
    const matchesSearch = gig.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         gig.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || gig.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
                <Users className="h-8 w-8 text-green-600" />
                <span className="text-2xl font-bold">{t.laborer.title}</span>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/laborer/withdraw')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.laborer.totalEarnings}</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{stats.totalEarnings}</div>
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs text-green-600 mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/laborer/withdraw');
                }}
              >
                <Wallet className="h-3 w-3 mr-1" />
                {t.laborer.withdrawal.title}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.laborer.completedTasks}</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTasks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{myApplications.filter(g => g.applicationStatus === 'completed').reduce((sum, g) => sum + g.reward, 0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="available">{t.laborer.availableGigs}</TabsTrigger>
            <TabsTrigger value="applications">{t.laborer.myApplications}</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.laborer.discovery.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">{t.laborer.discovery.filterByCategory}</option>
                <option value="weeding">{t.farmer.categories.weeding}</option>
                <option value="irrigation">{t.farmer.categories.irrigation}</option>
                <option value="composting">{t.farmer.categories.composting}</option>
                <option value="pestControl">{t.farmer.categories.pestControl}</option>
              </select>
            </div>

            {/* Available Gigs */}
            <div className="space-y-4">
              {filteredGigs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No available tasks at the moment</p>
                  </CardContent>
                </Card>
              ) : (
                filteredGigs.map((gig) => (
                  <Card key={gig.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-xl">{gig.taskName}</CardTitle>
                          <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {gig.distance}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {gig.duration}h
                            </span>
                            <span className="text-muted-foreground">{gig.postedDate}</span>
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">₹{gig.reward}</div>
                          <p className="text-xs text-muted-foreground">{gig.farmerName}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">{gig.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{gig.location}</Badge>
                        {getStatusButton(gig)}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            {myApplications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No applications yet</p>
                </CardContent>
              </Card>
            ) : (
              myApplications.map((gig) => (
                <Card key={gig.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-xl">{gig.taskName}</CardTitle>
                        <CardDescription className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {gig.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {gig.duration}h
                          </span>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">₹{gig.reward}</div>
                        {gig.status === 'verified' && (
                          <Badge className="bg-green-600 mt-1">
                            <CheckCircle className="mr-1 h-3 w-3" />Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">{gig.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Farmer: {gig.farmerName}</p>
                      {getStatusButton(gig)}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Proof Upload Dialog */}
      <Dialog open={isProofDialogOpen} onOpenChange={setIsProofDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.laborer.application.uploadProof.title}</DialogTitle>
            <DialogDescription>
              Upload photos and details of your completed work
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.laborer.application.uploadProof.uploadPhotos}</Label>
              
              {/* Photo Upload Area */}
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-green-500 transition-colors cursor-pointer"
                onClick={() => document.getElementById('photo-upload')?.click()}
              >
                <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">
                  {isUploadingPhoto ? 'Uploading...' : 'Click to upload photos'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Max 5 photos, up to 5MB each
                </p>
                <Input 
                  id="photo-upload"
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  multiple 
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto || proofPhotos.length >= 5}
                />
              </div>

              {/* Photo Previews */}
              {proofPhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {proofPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={photo} 
                        alt={`Proof ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t.laborer.application.uploadProof.addNotes}</Label>
              <Textarea
                placeholder={t.laborer.application.uploadProof.notesPlaceholder}
                rows={4}
                value={proofNotes}
                onChange={(e) => setProofNotes(e.target.value)}
              />
            </div>

            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleSubmitProof}
              disabled={isSubmitting || proofPhotos.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t.laborer.application.uploadProof.submit}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}