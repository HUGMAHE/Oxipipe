import { invoke } from "@tauri-apps/api/core";
import { useState, useCallback } from "react";
import type { PipelineDag, ExecuteResponse, SchemaResponse } from "../types";

interface UseExecutePipelineReturn {
  result: ExecuteResponse | null;
  isRunning: boolean;
  error: string | null;
  run: (dag: PipelineDag) => Promise<void>;
  clear: () => void;
}

export function useExecutePipeline(): UseExecutePipelineReturn {
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (dag: PipelineDag) => {
    setIsRunning(true);
    setError(null);
    try {
      const response = await invoke<ExecuteResponse>("execute_pipeline", { dag });
      setResult(response);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsRunning(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isRunning, error, run, clear };
}

interface UseInspectSchemaReturn {
  schema: SchemaResponse | null;
  isLoading: boolean;
  error: string | null;
  inspect: (path: string) => Promise<SchemaResponse | null>;
}

export function useInspectSchema(): UseInspectSchemaReturn {
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inspect = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await invoke<SchemaResponse>("inspect_schema", { path });
      setSchema(response);
      return response;
    } catch (err) {
      setError(String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { schema, isLoading, error, inspect };
}
