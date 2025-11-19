"use client"

import { useState } from 'react';
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
import { Users, Search, MapPin, Clock, Award, CheckCircle, Upload, Home, Camera, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ApplicationStatus = 'available' | 'applied' | 'working' | 'submitted' | 'verified';

interface Gig {
  id: string;
  taskName: string;
  description: string;
  category: string;
  location: string;
  reward: number;
  duration: number;
  farmerName: string;
  distance: string;
  postedDate: string;
  status: ApplicationStatus;
}

export default function LaborerDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);

  const [gigs, setGigs] = useState<Gig[]>([
    {
      id: '1',
      taskName: 'Organic Weeding - North Field',
      description: 'Remove weeds from 2 acres using manual methods only. Must follow organic farming practices.',
      category: 'weeding',
      location: 'Bangalore Rural, Karnataka',
      reward: 500,
      duration: 4,
      farmerName: 'Ramesh Kumar',
      distance: '3.2 km',
      postedDate: '2h ago',
      status: 'available'
    },
    {
      id: '2',
      taskName: 'Drip Irrigation Maintenance',
      description: 'Check and clean drip irrigation system, replace damaged pipes',
      category: 'irrigation',
      location: 'Bangalore Rural, Karnataka',
      reward: 400,
      duration: 3,
      farmerName: 'Lakshmi Devi',
      distance: '5.1 km',
      postedDate: '5h ago',
      status: 'available'
    },
    {
      id: '3',
      taskName: 'Compost Preparation',
      description: 'Prepare organic compost from farm waste',
      category: 'composting',
      location: 'Bangalore Rural, Karnataka',
      reward: 300,
      duration: 2,
      farmerName: 'Suresh Patil',
      distance: '1.8 km',
      postedDate: '1d ago',
      status: 'working'
    },
    {
      id: '4',
      taskName: 'Natural Pest Control Application',
      description: 'Apply neem-based pest control solution to vegetable crops',
      category: 'pestControl',
      location: 'Bangalore Rural, Karnataka',
      reward: 350,
      duration: 2.5,
      farmerName: 'Gowda',
      distance: '4.5 km',
      postedDate: '2d ago',
      status: 'applied'
    }
  ]);

  const handleApply = (gigId: string) => {
    setGigs(gigs.map(gig => 
      gig.id === gigId ? { ...gig, status: 'applied' } : gig
    ));
  };

  const handleStartWork = (gigId: string) => {
    setGigs(gigs.map(gig => 
      gig.id === gigId ? { ...gig, status: 'working' } : gig
    ));
  };

  const handleSubmitProof = (gigId: string) => {
    setGigs(gigs.map(gig => 
      gig.id === gigId ? { ...gig, status: 'submitted' } : gig
    ));
    setIsProofDialogOpen(false);
  };

  const myApplications = gigs.filter(g => ['applied', 'working', 'submitted', 'verified'].includes(g.status));
  const availableGigs = gigs.filter(g => g.status === 'available');

  const stats = {
    totalEarnings: gigs.filter(g => g.status === 'verified').reduce((sum, g) => sum + g.reward, 0),
    completedTasks: gigs.filter(g => g.status === 'verified').length,
    pendingVerification: gigs.filter(g => g.status === 'submitted').length,
  };

  const getStatusButton = (gig: Gig) => {
    switch (gig.status) {
      case 'available':
        return (
          <Button 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleApply(gig.id)}
          >
            {t.laborer.application.applyButton}
          </Button>
        );
      case 'applied':
        return (
          <div className="flex gap-2">
            <Badge variant="secondary">{t.laborer.application.applied}</Badge>
            <Button 
              size="sm"
              onClick={() => handleStartWork(gig.id)}
            >
              {t.laborer.application.startWork}
            </Button>
          </div>
        );
      case 'working':
        return (
          <Button 
            onClick={() => {
              setSelectedGig(gig);
              setIsProofDialogOpen(true);
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t.laborer.application.submitProof}
          </Button>
        );
      case 'submitted':
        return <Badge variant="outline">Pending Verification</Badge>;
      case 'verified':
        return <Badge className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Verified</Badge>;
    }
  };

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
              <div className="text-2xl font-bold">₹{gigs.filter(g => g.status === 'submitted').reduce((sum, g) => sum + g.reward, 0)}</div>
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
              {availableGigs.map((gig) => (
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
              ))}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.laborer.application.uploadProof.title}</DialogTitle>
            <DialogDescription>
              Upload photos and details of your completed work
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.laborer.application.uploadProof.uploadPhotos}</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-green-500 transition-colors cursor-pointer">
                <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload photos</p>
                <Input type="file" className="hidden" accept="image/*" multiple />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.laborer.application.uploadProof.addNotes}</Label>
              <Textarea
                placeholder={t.laborer.application.uploadProof.notesPlaceholder}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.laborer.application.uploadProof.location}</Label>
              <Button variant="outline" className="w-full">
                <MapPin className="mr-2 h-4 w-4" />
                Capture Current Location
              </Button>
            </div>

            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => selectedGig && handleSubmitProof(selectedGig.id)}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {t.laborer.application.uploadProof.submit}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}