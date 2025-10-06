// src/components/UpdatePopup.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, Clock, ExternalLink } from 'lucide-react';
import { updateService, ReleaseInfo } from '@/services/updateService';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeRaw from 'rehype-raw';

interface UpdatePopupProps {
  isOpen: boolean;
  onClose: () => void;
  releaseInfo: ReleaseInfo;
}

export const UpdatePopup = ({ isOpen, onClose, releaseInfo }: UpdatePopupProps) => {
  const [isOpening, setIsOpening] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setIsOpening(true);
      await updateService.openReleasesPage();
      toast({
        title: "Opening Releases Page",
        description: "The GitHub releases page has been opened in your browser.",
        duration: 3000
      });
    } catch (error) {
      toast({
        title: "Failed to Open",
        description: "Failed to open the releases page. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsOpening(false);
    }
  };

  const handleRemindTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    localStorage.setItem('updateReminderTime', tomorrow.toISOString());
    onClose();
    
    toast({
      title: "Reminder Set",
      description: "We'll remind you about this update tomorrow.",
      duration: 3000
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const markdownComponents = {
    img: ({ src, alt, ...props }: any) => (
      <img
        src={src}
        alt={alt}
        {...props}
        className="max-w-full h-auto rounded-lg border border-border my-2"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    ),
    a: ({ href, children, ...props }: any) => (
      <a
        href={href}
        {...props}
        className="text-blue-600 dark:text-blue-400 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    code: ({ children, ...props }: any) => (
      <code
        {...props}
        className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
      >
        {children}
      </code>
    ),
    pre: ({ children, ...props }: any) => (
      <pre
        {...props}
        className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono border"
      >
        {children}
      </pre>
    ),
    blockquote: ({ children, ...props }: any) => (
      <blockquote
        {...props}
        className="border-l-4 border-border pl-4 italic text-muted-foreground"
      >
        {children}
      </blockquote>
    ),
    h1: ({ children, ...props }: any) => (
      <h1 {...props} className="text-xl font-bold mb-2 mt-4">
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 {...props} className="text-lg font-semibold mb-2 mt-3">
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 {...props} className="text-base font-medium mb-1 mt-2">
        {children}
      </h3>
    ),
    ul: ({ children, ...props }: any) => (
      <ul {...props} className="list-disc list-inside space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol {...props} className="list-decimal list-inside space-y-1">
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li {...props} className="text-sm">
        {children}
      </li>
    ),
    p: ({ children, ...props }: any) => (
      <p {...props} className="text-sm mb-2 last:mb-0">
        {children}
      </p>
    ),
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <DialogTitle className="text-xl">Update Available!</DialogTitle>
                <DialogDescription>
                  A new version of AI Tools Hub is available for download
                </DialogDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              v{releaseInfo.version}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              Released on {formatDate(releaseInfo.publishedAt)}
            </div>
            <h4 className="font-medium mb-2">What's New:</h4>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={markdownComponents}
              >
                {releaseInfo.releaseNotes}
              </ReactMarkdown>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Download from GitHub
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Visit the releases page to download the latest version for your platform.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRemindTomorrow}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Remind Tomorrow
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isOpening}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            {isOpening ? 'Opening...' : 'Go to Releases'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};