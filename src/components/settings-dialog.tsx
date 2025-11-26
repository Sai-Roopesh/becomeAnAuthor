'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Zap, Users, Share2, Lock, CreditCard, LogOut, Sun, Moon, Settings } from 'lucide-react';
import { useState } from 'react';
import { AIConnectionsTab } from '@/components/settings/ai-connections-tab';
import { useTheme } from 'next-themes';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useFormatStore } from '@/store/use-format-store';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export function SettingsDialog() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('ai-connections');
    const { theme, setTheme } = useTheme();
    const formatSettings = useFormatStore();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
                <Zap className="h-5 w-5" />
            </Button>

            <DialogContent
                className="max-w-5xl h-[700px] p-0 bg-background fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2"
                aria-describedby={undefined}
            >
                <VisuallyHidden>
                    <DialogTitle>Settings</DialogTitle>
                </VisuallyHidden>
                <div className="flex h-full bg-background">
                    {/* Sidebar Navigation */}
                    <div className="w-64 border-r bg-secondary/30 flex flex-col">
                        <div className="p-4 border-b bg-background">
                            <h2 className="text-lg font-semibold">Settings</h2>
                        </div>

                        <div className="flex-1 p-2 space-y-1 bg-secondary/30">
                            <button
                                onClick={() => setActiveTab('ai-connections')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'ai-connections' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                                    }`}
                            >
                                <Zap className="h-4 w-4" />
                                <span className="text-sm">AI Connections</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('general')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'general' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                                    }`}
                            >
                                <Settings className="h-4 w-4" />
                                <span className="text-sm">General Settings</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('teams')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'teams' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                                    }`}
                            >
                                <Users className="h-4 w-4" />
                                <span className="text-sm">Teams</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('shared')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'shared' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                                    }`}
                            >
                                <Share2 className="h-4 w-4" />
                                <span className="text-sm">Shared with me</span>
                            </button>

                            <div className="my-2 border-t" />

                            <button
                                onClick={() => setActiveTab('account')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'account' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                                    }`}
                            >
                                <Lock className="h-4 w-4" />
                                <span className="text-sm">Account / Security</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('subscription')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'subscription' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                                    }`}
                            >
                                <CreditCard className="h-4 w-4" />
                                <span className="text-sm">Manage Subscription</span>
                            </button>

                            <div className="my-2 border-t" />

                            <button
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="text-sm">Logout</span>
                            </button>
                        </div>

                        {/* Theme Toggle */}
                        <div className="p-4 border-t bg-background">
                            <div className="text-xs text-muted-foreground mb-2">Theme:</div>
                            <div className="flex gap-2">
                                <Button
                                    variant={theme === 'light' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setTheme('light')}
                                    className="flex-1"
                                >
                                    <Sun className="h-3 w-3 mr-1" />
                                    Light
                                </Button>
                                <Button
                                    variant={theme === 'dark' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setTheme('dark')}
                                    className="flex-1"
                                >
                                    <Moon className="h-3 w-3 mr-1" />
                                    Dark
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col bg-background overflow-hidden">
                        {activeTab === 'ai-connections' && (
                            <div className="flex-1 flex flex-col bg-background overflow-hidden">
                                <AIConnectionsTab />
                            </div>
                        )}

                        {activeTab === 'general' && (
                            <div className="p-6 bg-background h-full overflow-y-auto">
                                <h3 className="text-lg font-semibold mb-6">General Settings</h3>

                                <div className="space-y-8">
                                    {/* Appearance Section */}
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Appearance</h4>
                                        <div className="grid gap-4">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="font-family">Font Family</Label>
                                                <Select
                                                    value={formatSettings.fontFamily}
                                                    onValueChange={(value) => formatSettings.updateSettings({ fontFamily: value })}
                                                >
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue placeholder="Select font" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Georgia">Georgia (Serif)</SelectItem>
                                                        <SelectItem value="Merriweather">Merriweather (Serif)</SelectItem>
                                                        <SelectItem value="Inter">Inter (Sans)</SelectItem>
                                                        <SelectItem value="Arial">Arial (Sans)</SelectItem>
                                                        <SelectItem value="Courier Prime">Courier Prime (Mono)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="font-size">Font Size: {formatSettings.fontSize}px</Label>
                                                </div>
                                                <Slider
                                                    id="font-size"
                                                    min={12}
                                                    max={24}
                                                    step={1}
                                                    value={[formatSettings.fontSize]}
                                                    onValueChange={([value]) => formatSettings.updateSettings({ fontSize: value })}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="line-height">Line Height: {formatSettings.lineHeight}</Label>
                                                </div>
                                                <Slider
                                                    id="line-height"
                                                    min={1.0}
                                                    max={2.5}
                                                    step={0.1}
                                                    value={[formatSettings.lineHeight]}
                                                    onValueChange={([value]) => formatSettings.updateSettings({ lineHeight: value })}
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    <Separator />

                                    {/* Editor Experience Section */}
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Editor Experience</h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label htmlFor="typewriter-mode">Typewriter Mode</Label>
                                                    <p className="text-xs text-muted-foreground">Keeps the active line centered in the editor.</p>
                                                </div>
                                                <Switch
                                                    id="typewriter-mode"
                                                    checked={formatSettings.typewriterMode}
                                                    onCheckedChange={(checked) => formatSettings.updateSettings({ typewriterMode: checked })}
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    <Separator />

                                    {/* Interface Section */}
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Interface</h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="show-line-numbers">Show Line Numbers</Label>
                                                <Switch
                                                    id="show-line-numbers"
                                                    checked={formatSettings.showLineNumbers}
                                                    onCheckedChange={(checked) => formatSettings.updateSettings({ showLineNumbers: checked })}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="show-word-count">Show Word Count</Label>
                                                <Switch
                                                    id="show-word-count"
                                                    checked={formatSettings.showWordCount}
                                                    onCheckedChange={(checked) => formatSettings.updateSettings({ showWordCount: checked })}
                                                />
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}

                        {activeTab === 'teams' && (
                            <div className="flex flex-col items-center justify-center h-full p-6 bg-background">
                                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Teams</h3>
                                <p className="text-sm text-muted-foreground text-center max-w-md">
                                    Team collaboration features coming soon. Work together on your stories with other writers.
                                </p>
                            </div>
                        )}

                        {activeTab === 'shared' && (
                            <div className="flex flex-col items-center justify-center h-full p-6 bg-background">
                                <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Shared with me</h3>
                                <p className="text-sm text-muted-foreground text-center max-w-md">
                                    Projects shared with you by other writers will appear here.
                                </p>
                            </div>
                        )}

                        {activeTab === 'account' && (
                            <div className="flex flex-col items-center justify-center h-full p-6 bg-background">
                                <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Account & Security</h3>
                                <p className="text-sm text-muted-foreground text-center max-w-md">
                                    Manage your account settings, password, and security preferences.
                                </p>
                            </div>
                        )}

                        {activeTab === 'subscription' && (
                            <div className="flex flex-col items-center justify-center h-full p-6 bg-background">
                                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Manage Subscription</h3>
                                <p className="text-sm text-muted-foreground text-center max-w-md">
                                    View and manage your subscription plan, billing, and payment methods.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
