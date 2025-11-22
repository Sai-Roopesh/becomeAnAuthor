'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BackupButton } from '@/components/backup-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SettingsDialog() {
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('openai/gpt-3.5-turbo');
    const [models, setModels] = useState<{ id: string, name: string }[]>([]);
    const [open, setOpen] = useState(false);
    const [loadingModels, setLoadingModels] = useState(false);

    useEffect(() => {
        const storedKey = localStorage.getItem('openrouter_api_key');
        const storedModel = localStorage.getItem('openrouter_model');
        if (storedKey) setApiKey(storedKey);
        if (storedModel) setModel(storedModel);
    }, []);

    useEffect(() => {
        if (open && apiKey) {
            fetchModels();
        }
    }, [open, apiKey]);

    const fetchModels = async () => {
        setLoadingModels(true);
        try {
            const res = await fetch('https://openrouter.ai/api/v1/models');
            const data = await res.json();
            if (data.data) {
                setModels(data.data.map((m: any) => ({ id: m.id, name: m.name })));
            }
        } catch (e) {
            console.error("Failed to fetch models", e);
        } finally {
            setLoadingModels(false);
        }
    };

    const handleSave = () => {
        localStorage.setItem('openrouter_api_key', apiKey);
        localStorage.setItem('openrouter_model', model);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Configure your AI provider settings.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="apiKey" className="text-right">
                            API Key
                        </Label>
                        <Input
                            id="apiKey"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="col-span-3"
                            placeholder="sk-or-..."
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="model" className="text-right">
                            Model
                        </Label>
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                                {loadingModels ? (
                                    <SelectItem value="loading" disabled>Loading models...</SelectItem>
                                ) : (
                                    models.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))
                                )}
                                {!loadingModels && models.length === 0 && (
                                    <SelectItem value="openai/gpt-3.5-turbo">GPT-3.5 Turbo (Default)</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="text-xs text-muted-foreground ml-auto col-span-4 text-right">
                        Get your key from <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline">OpenRouter</a>
                    </div>
                </div>
                <DialogFooter className="flex justify-between sm:justify-between">
                    <BackupButton />
                    <Button onClick={handleSave}>Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
