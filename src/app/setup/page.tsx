"use client";

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-card rounded-lg border border-border p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-foreground mb-2">Configuration Required</h1>
          <p className="text-muted-foreground mb-6">
            Firebase credentials are not configured. Please set up your environment variables to continue.
          </p>
          
          <div className="bg-muted rounded-lg p-4 mb-6">
            <p className="text-sm font-mono text-foreground mb-3">Add these to your <code className="bg-background px-2 py-1 rounded">.env.local</code> file:</p>
            <pre className="text-xs text-muted-foreground overflow-auto bg-background rounded p-3">
{`NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id`}
            </pre>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Get these values from your <a 
                href="https://console.firebase.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Firebase Console
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              After adding the variables, restart the development server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
