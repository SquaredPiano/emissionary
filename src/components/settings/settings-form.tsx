'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Bell, Shield, Target, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function SettingsForm() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    notifications: {
      weeklyReport: true,
      monthlyReport: true,
      tips: true,
      achievements: false
    },
    preferences: {
      emissionGoal: 15,
      currency: 'CAD',
      language: 'en',
      theme: 'system'
    },
    privacy: {
      shareData: false,
      analytics: true
    }
  });

  const handleSave = async () => {
    // TODO: Replace with actual API call to backend
    // Only emissionary-specific settings are saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: 'Settings saved',
      description: 'Your emissionary preferences have been updated.',
      duration: 2500,
    });
  };

  return (
    <div className="space-y-6">
      {/* Emission Goals */}
      <Card className="bg-background/50 backdrop-blur-[24px] border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Emission Goals
          </CardTitle>
          <CardDescription>
            Set your personal carbon emission reduction targets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weeklyGoal">Weekly Emission Goal (kg CO₂e)</Label>
              <Input 
                id="weeklyGoal" 
                type="number" 
                value={settings.preferences.emissionGoal}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  preferences: { ...prev.preferences, emissionGoal: parseFloat(e.target.value) || 0 }
                }))}
                placeholder="15"
              />
              <p className="text-xs text-black dark:text-muted-foreground">
                Target weekly grocery emissions
              </p>
            </div>
            <div className="space-y-2">
              <Label>Current Progress</Label>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">12.4 kg</div>
                <div className="text-sm text-black dark:text-muted-foreground">
                  This week's emissions
                </div>
                <Badge variant="outline" className="mt-2 text-black dark:text-muted-foreground">
                  {settings.preferences.emissionGoal > 12.4 ? 'On Track' : 'Over Target'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-background/50 backdrop-blur-[24px] border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choose which notifications you'd like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Emission Report</Label>
                <p className="text-sm text-black dark:text-muted-foreground">
                  Get a summary of your weekly carbon footprint
                </p>
              </div>
              <Switch 
                checked={settings.notifications.weeklyReport}
                onCheckedChange={(checked: boolean) => 
                  setSettings(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, weeklyReport: checked }
                  }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Monthly Progress Report</Label>
                <p className="text-sm text-black dark:text-muted-foreground">
                  Monthly summary with trends and insights
                </p>
              </div>
              <Switch 
                checked={settings.notifications.monthlyReport}
                onCheckedChange={(checked: boolean) => 
                  setSettings(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, monthlyReport: checked }
                  }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sustainability Tips</Label>
                <p className="text-sm text-black dark:text-muted-foreground">
                  Personalized tips to reduce your emissions
                </p>
              </div>
              <Switch 
                checked={settings.notifications.tips}
                onCheckedChange={(checked: boolean) => 
                  setSettings(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, tips: checked }
                  }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Achievement Notifications</Label>
                <p className="text-sm text-black dark:text-muted-foreground">
                  Celebrate your emission reduction milestones
                </p>
              </div>
              <Switch 
                checked={settings.notifications.achievements}
                onCheckedChange={(checked: boolean) => 
                  setSettings(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, achievements: checked }
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card className="bg-background/50 backdrop-blur-[24px] border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Data
          </CardTitle>
          <CardDescription>
            Control how your data is used and shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Share Anonymous Data</Label>
                <p className="text-sm text-black dark:text-muted-foreground">
                  Help improve our emission calculations (no personal info)
                </p>
              </div>
              <Switch 
                checked={settings.privacy.shareData}
                onCheckedChange={(checked: boolean) => 
                  setSettings(prev => ({ 
                    ...prev, 
                    privacy: { ...prev.privacy, shareData: checked }
                  }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Analytics</Label>
                <p className="text-sm text-black dark:text-muted-foreground">
                  Help us improve the app with usage analytics
                </p>
              </div>
              <Switch 
                checked={settings.privacy.analytics}
                onCheckedChange={(checked: boolean) => 
                  setSettings(prev => ({ 
                    ...prev, 
                    privacy: { ...prev.privacy, analytics: checked }
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}

// Export a SettingsModal component that renders the settings form inside a modal dialog. 