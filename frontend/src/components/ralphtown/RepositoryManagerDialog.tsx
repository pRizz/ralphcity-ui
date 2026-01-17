import { useState } from "react";
import { Trash2, Plus, FolderGit2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRepos, useDeleteRepo } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { CloneDialog } from "./CloneDialog";
import type { Repo } from "@/api/types";

export function RepositoryManagerDialog() {
  const [open, setOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<Repo | null>(null);

  const { data: repos, isLoading } = useRepos();
  const deleteRepo = useDeleteRepo();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!repoToDelete) return;

    try {
      await deleteRepo.mutateAsync(repoToDelete.id);
      toast({
        title: "Repository removed",
        description: `${repoToDelete.name} has been removed from the list.`,
      });
    } catch (error) {
      toast({
        title: "Failed to remove repository",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRepoToDelete(null);
    }
  };

  const handleCloneSuccess = (repo: Repo) => {
    setCloneDialogOpen(false);
    toast({
      title: "Repository cloned",
      description: `${repo.name} has been added to your repositories.`,
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return "Unknown";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <FolderGit2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Repositories</DialogTitle>
            <DialogDescription>
              View and manage your tracked repositories. Files on disk are not affected when removing.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Clone button */}
            <div className="mb-4">
              <Button
                onClick={() => setCloneDialogOpen(true)}
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Clone Repository
              </Button>
            </div>

            {/* Repository table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading repositories...
              </div>
            ) : !repos || repos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No repositories yet.</p>
                <p className="text-sm mt-1">Click "Clone Repository" to add one.</p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repos.map((repo) => (
                      <TableRow key={repo.id}>
                        <TableCell className="font-medium">{repo.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm font-mono truncate max-w-[200px]">
                          {repo.path}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(repo.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setRepoToDelete(repo)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!repoToDelete} onOpenChange={(open) => !open && setRepoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Repository?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{repoToDelete?.name}" from the list. The files on disk will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRepo.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone dialog */}
      <CloneDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        onCloneSuccess={handleCloneSuccess}
      />
    </>
  );
}
