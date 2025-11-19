"use client"

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sprout, CheckCircle, Award, Users, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { t } = useLanguage();
  const router = useRouter();

  const impactMetrics = [
    { label: t.metrics.totalGigs, value: "2,547", icon: Sprout },
    { label: t.metrics.completedTasks, value: "1,893", icon: CheckCircle },
    { label: t.metrics.earnedRewards, value: "₹2.4L", icon: Award },
    { label: t.metrics.activeFarmers, value: "342", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold text-green-600">{t.appName}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {t.hero.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-green-600 hover:bg-green-700"
              onClick={() => router.push('/farmer')}
            >
              <Sprout className="mr-2 h-5 w-5" />
              {t.hero.farmerCTA}
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
              onClick={() => router.push('/laborer')}
            >
              <Users className="mr-2 h-5 w-5" />
              {t.hero.laborerCTA}
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-12">{t.overview.title}</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="border-2 hover:border-green-500 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>{t.overview.sense.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">{t.overview.sense.description}</CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-green-500 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>{t.overview.verify.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">{t.overview.verify.description}</CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-green-500 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>{t.overview.reward.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">{t.overview.reward.description}</CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Impact Metrics */}
      <section className="container mx-auto px-4 py-20 bg-green-50 dark:bg-green-950/20 rounded-3xl">
        <h2 className="text-4xl font-bold text-center mb-12">{t.metrics.title}</h2>
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {impactMetrics.map((metric, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <metric.icon className="h-10 w-10 mx-auto mb-4 text-green-600" />
                <div className="text-3xl font-bold text-green-600 mb-2">{metric.value}</div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold">Ready to Transform Your Farming Journey?</h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of farmers and workers building a sustainable agricultural future.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button 
              size="lg"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => router.push('/farmer')}
            >
              Get Started as Farmer
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => router.push('/laborer')}
            >
              Get Started as Laborer
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 {t.appName}. Empowering sustainable agriculture through micro-actions.</p>
        </div>
      </footer>
    </div>
  );
}