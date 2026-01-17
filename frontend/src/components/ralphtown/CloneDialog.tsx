import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useCloneProgress } from "@/hooks/useCloneProgress";
import { useToast } from "@/hooks/use-toast";
import type { Repo, CloneProgress, AuthType, CredentialRequest } from "@/api/types";

interface CloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloneSuccess: (repo: Repo) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function CloneDialog({ open, onOpenChange, onCloneSuccess }: CloneDialogProps) {
  const [gitUrl, setGitUrl] = useState("");
  const [cloneProgress, setCloneProgress] = useState<CloneProgress | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    helpSteps?: string[];
    authType?: AuthType;
    canRetry?: boolean;
  } | null>(null);
  // Credential input states
  const [credentialMode, setCredentialMode] = useState<AuthType | null>(null);
  const [patToken, setPatToken] = useState("");
  const [sshPassphrase, setSshPassphrase] = useState("");
  const [httpUsername, setHttpUsername] = useState("");
  const [httpPassword, setHttpPassword] = useState("");
  const { toast } = useToast();

  const { startClone, startCloneWithCredentials, cancel } = useCloneProgress({
    onProgress: setCloneProgress,
    onComplete: (repo, message) => {
      setIsCloning(false);
      setCloneProgress(null);
      // Reset credential state on success
      setCredentialMode(null);
      setPatToken("");
      setSshPassphrase("");
      setHttpUsername("");
      setHttpPassword("");
      onCloneSuccess(repo);
      setGitUrl("");
      onOpenChange(false);
      toast({
        title: "Repository cloned",
        description: message,
      });
    },
    onError: (message, helpSteps, authType, canRetry) => {
      setIsCloning(false);
      setCloneProgress(null);
      setErrorInfo({ message, helpSteps, authType, canRetry });
      if (canRetry && authType) {
        setCredentialMode(authType);
      }
      toast({
        title: "Failed to clone repository",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleClone = () => {
    const trimmedUrl = gitUrl.trim();
    if (!trimmedUrl) {
      toast({
        title: "URL required",
        description: "Enter a git URL to clone.",
        variant: "destructive",
      });
      return;
    }

    setErrorInfo(null);
    setIsCloning(true);
    startClone(trimmedUrl);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isCloning) {
      cancel();
      setIsCloning(false);
      setCloneProgress(null);
    }
    onOpenChange(newOpen);
    if (!newOpen) {
      setGitUrl("");
      setErrorInfo(null);
      setCredentialMode(null);
      setPatToken("");
      setSshPassphrase("");
      setHttpUsername("");
      setHttpPassword("");
    }
  };

  const handleRetryWithCredentials = () => {
    if (!credentialMode) return;

    let credentials: CredentialRequest;
    if (credentialMode === "github_pat") {
      credentials = { type: "github_pat", token: patToken };
    } else if (credentialMode === "https_basic") {
      credentials = { type: "https_basic", username: httpUsername, password: httpPassword };
    } else {
      credentials = { type: "ssh_passphrase", passphrase: sshPassphrase };
    }

    setErrorInfo(null);
    setIsCloning(true);
    startCloneWithCredentials(gitUrl, credentials);
  };

  const hasValidCredentials = () => {
    if (credentialMode === "github_pat") return patToken.trim().length > 0;
    if (credentialMode === "https_basic") return httpUsername.trim().length > 0 && httpPassword.trim().length > 0;
    if (credentialMode === "ssh") return sshPassphrase.trim().length > 0;
    return false;
  };

  // Calculate progress percentage
  const getProgressPercentage = (): number => {
    if (!cloneProgress || cloneProgress.total_objects === 0) return 0;
    return Math.round(
      (cloneProgress.received_objects / cloneProgress.total_objects) * 100
    );
  };

  // Determine current phase and text
  const getProgressText = (): string => {
    if (!cloneProgress) return "";

    const { received_objects, total_objects, received_bytes, indexed_deltas, total_deltas } =
      cloneProgress;

    // Indexing phase: download complete, now indexing deltas
    if (received_objects === total_objects && total_deltas > 0 && indexed_deltas < total_deltas) {
      return `Indexing: ${indexed_deltas} / ${total_deltas} deltas`;
    }

    // Download phase
    return `Downloading: ${received_objects} / ${total_objects} objects (${formatBytes(received_bytes)})`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Clone from URL</DialogTitle>
          <DialogDescription>
            Enter a git URL (SSH or HTTPS) to clone the repository.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gitUrl" className="text-right">
              URL
            </Label>
            <Input
              id="gitUrl"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              className="col-span-3"
              disabled={isCloning}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCloning) {
                  handleClone();
                }
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground ml-auto col-span-3 pr-1">
            Repository will be cloned to ~/ralphtown/
          </p>
          {isCloning && (
            <div className="space-y-2">
              <Progress value={getProgressPercentage()} className="w-full" />
              <p className="text-xs text-muted-foreground text-center">
                {getProgressText()}
              </p>
            </div>
          )}
          {errorInfo && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm font-medium text-destructive mb-2">
                {errorInfo.message}
              </p>
              {errorInfo.helpSteps && errorInfo.helpSteps.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Troubleshooting steps:
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                    {errorInfo.helpSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {credentialMode && (
            <div className="space-y-4 mt-4 p-4 border rounded-md bg-muted/50">
              <h4 className="font-medium text-sm">Authentication Required</h4>

              {credentialMode === "github_pat" && (
                <div className="space-y-2">
                  <Label htmlFor="pat">GitHub Personal Access Token</Label>
                  <Input
                    id="pat"
                    type="password"
                    value={patToken}
                    onChange={(e) => setPatToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    disabled={isCloning}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used only for this clone. Not stored.
                  </p>
                </div>
              )}

              {credentialMode === "https_basic" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={httpUsername}
                      onChange={(e) => setHttpUsername(e.target.value)}
                      disabled={isCloning}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={httpPassword}
                      onChange={(e) => setHttpPassword(e.target.value)}
                      disabled={isCloning}
                    />
                    <p className="text-xs text-muted-foreground">
                      Used only for this clone. Not stored.
                    </p>
                  </div>
                </>
              )}

              {credentialMode === "ssh" && (
                <div className="space-y-2">
                  <Label htmlFor="passphrase">SSH Key Passphrase</Label>
                  <Input
                    id="passphrase"
                    type="password"
                    value={sshPassphrase}
                    onChange={(e) => setSshPassphrase(e.target.value)}
                    placeholder="Enter passphrase for your SSH key"
                    disabled={isCloning}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used only for this clone. Not stored.
                  </p>
                </div>
              )}

              <Button
                onClick={handleRetryWithCredentials}
                disabled={isCloning || !hasValidCredentials()}
                className="w-full"
              >
                {isCloning ? "Cloning..." : "Retry with Credentials"}
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCloning}
          >
            Cancel
          </Button>
          <Button onClick={handleClone} disabled={isCloning}>
            {isCloning ? "Cloning..." : "Clone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
