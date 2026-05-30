"use client";

export function RootErrorFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-destructive"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Become an Author
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Something unexpected went wrong and the app could not recover. Your
          work is saved locally — restarting should resolve the issue.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Reload app
        </button>
      </div>
    </div>
  );
}
