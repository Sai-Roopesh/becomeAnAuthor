"use client";
import { useEffect, useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

const QUOTES = [
    "The scariest moment is always just before you start.",
    "You can always edit a bad page. You can't edit a blank page.",
    "Start writing, no matter what. The water does not flow until the faucet is turned on.",
    "Every secret of a writer's soul is written large in his works.",
    "There is no greater agony than bearing an untold story inside you.",
];

export function DashboardHeader() {
    const [greeting, setGreeting] = useState('Welcome back');
    const [quote, setQuote] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');

        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)] ?? '');
    }, []);

    return (
        <div className="relative mb-8 p-6 rounded-2xl bg-muted/30 border border-border/50 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px)] bg-[size:20px_20px] opacity-30" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-foreground">
                            {greeting}, <span className="text-primary">Author</span>
                        </h1>
                        <p className="text-sm text-muted-foreground">Your novels await</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground italic max-w-md">
                    <Sparkles className="w-4 h-4 text-primary/50 flex-shrink-0" />
                    <span className="line-clamp-1">"{quote}"</span>
                </div>
            </div>
        </div>
    );
}

