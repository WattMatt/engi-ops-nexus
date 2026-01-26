import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Search, Loader2, FileText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  content: string;
  document_title: string;
  document_id: string;
  similarity: number;
  chunk_index: number;
}

export function KnowledgeSearchTester() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [matchCount, setMatchCount] = useState([5]);
  const [threshold, setThreshold] = useState([0.6]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("search-knowledge", {
        body: {
          query: query.trim(),
          matchCount: matchCount[0],
          threshold: threshold[0],
        },
      });

      if (error) throw error;

      setResults(data.results || []);

      if (data.results?.length === 0) {
        toast.info("No matching documents found. Try adjusting the threshold or query.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return "bg-green-500";
    if (similarity >= 0.7) return "bg-emerald-500";
    if (similarity >= 0.6) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Search Tester</CardTitle>
            <CardDescription>
              Test semantic search against your knowledge base
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter a question or topic to search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {/* Search Parameters */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
          <div className="space-y-2">
            <Label className="text-sm">Results: {matchCount[0]}</Label>
            <Slider
              value={matchCount}
              onValueChange={setMatchCount}
              min={1}
              max={10}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Threshold: {threshold[0].toFixed(2)}</Label>
            <Slider
              value={threshold}
              onValueChange={setThreshold}
              min={0.4}
              max={0.9}
              step={0.05}
            />
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="h-[300px]">
          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((result, idx) => (
                <div
                  key={result.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {result.document_title}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Chunk {result.chunk_index + 1}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-full ${getSimilarityColor(result.similarity)}`}
                      />
                      <span className="text-sm font-mono">
                        {(result.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          ) : !isSearching ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Search className="h-8 w-8 mb-2" />
              <p>Enter a query to search your knowledge base</p>
              <p className="text-sm">Results will show semantic matches with similarity scores</p>
            </div>
          ) : null}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
