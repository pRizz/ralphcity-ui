import { useState } from "react";
import { AgentSidebar } from "@/components/gastown/AgentSidebar";
import { MainPanel } from "@/components/gastown/MainPanel";
import { mockGastownInstances } from "@/data/mockData";
import { GastownInstance, Repository } from "@/types/gastown";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [instances, setInstances] = useState<GastownInstance[]>(mockGastownInstances);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleNewGastown = () => {
    setActiveInstanceId(null);
  };

  const handleSpawnGastown = (
    prompt: string,
    repo: Repository,
    branch: string,
    model: string
  ) => {
    const newInstance: GastownInstance = {
      id: crypto.randomUUID(),
      title: prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt,
      repo: repo.name,
      branch,
      status: "running",
      createdAt: new Date(),
      model,
    };

    setInstances((prev) => [newInstance, ...prev]);
    setActiveInstanceId(newInstance.id);

    toast({
      title: "Gastown spawned",
      description: `Running "${newInstance.title}" on ${repo.fullName}`,
    });
  };

  return (
    <div className="flex min-h-screen w-full">
      <AgentSidebar
        instances={instances}
        activeInstanceId={activeInstanceId}
        onSelectInstance={setActiveInstanceId}
        onNewGastown={handleNewGastown}
      />
      <MainPanel onSpawnGastown={handleSpawnGastown} />
    </div>
  );
};

export default Index;
