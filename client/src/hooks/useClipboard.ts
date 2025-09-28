import { useToast } from "@/hooks/use-toast";

export function useClipboard() {
  const { toast } = useToast();

  const copy = async (text: string, message: string = "Copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        description: message,
        duration: 2000,
      });
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      toast({
        description: "Failed to copy to clipboard",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  return { copy };
}