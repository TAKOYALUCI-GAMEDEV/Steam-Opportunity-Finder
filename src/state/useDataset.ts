import { useEffect, useState } from "react";
import type { Dataset } from "@/types/dataset";
import { loadDataset } from "@/lib/dataset";

interface State {
  dataset: Dataset | null;
  error: string | null;
  loading: boolean;
}

export function useDataset(): State {
  const [state, setState] = useState<State>({
    dataset: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    loadDataset()
      .then((dataset) => alive && setState({ dataset, error: null, loading: false }))
      .catch(
        (e: unknown) =>
          alive &&
          setState({
            dataset: null,
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          }),
      );
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
