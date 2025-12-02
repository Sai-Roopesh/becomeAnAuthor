import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';

const QUOTES = [
    "The scariest moment is always just before you start.",
    "You can always edit a bad page. You can't edit a blank page.",
    "Start writing, no matter what. The water does not flow until the faucet is turned on.",
    "Every secret of a writer’s soul, every experience of his life, every quality of his mind, is written large in his works.",
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

        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, []);

    return (
        <div className="relative mb-12 p-8 md:p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-background to-accent/5 border border-border/50 overflow-hidden shadow-xl shadow-primary/5">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

            <div className="relative z-10 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3 text-primary mb-2">
                    <div className="p-2.5 bg-background/50 backdrop-blur-md rounded-xl border border-white/10 shadow-sm">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="font-heading font-semibold tracking-wider uppercase text-xs">Writer's Studio</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-heading font-bold text-foreground tracking-tight">
                    {greeting}, <span className="text-primary">Author</span>.
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl font-light italic leading-relaxed">
                    "{quote}"
                </p>
            </div>
        </div>
    );
}
