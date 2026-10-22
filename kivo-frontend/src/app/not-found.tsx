import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { AppHeader } from "@/components/layout/AppHeader";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <PageContainer className="flex flex-1 items-center justify-center py-16">
        <div className="flex max-w-md flex-col items-center text-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileQuestion className="size-7 text-kivo-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Page Not Found</h1>
            <p className="text-sm text-muted-foreground">
              The page you are looking for does not exist or has been moved.
            </p>
          </div>
          <Button asChild variant="default" className="mt-2">
            <Link href="/">Return to Foundation Preview</Link>
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}
